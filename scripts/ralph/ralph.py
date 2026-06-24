#!/usr/bin/env python3
"""
Ralph - 自主 AI Agent 循环执行器（含 Validator）
"""

import json
import sys
import subprocess
import time
import os
import shutil
from pathlib import Path

import dashboard

# 配置
MAX_ITERATIONS = 200
TIMEOUT_SECONDS = 30 * 60
# Windows: 隐藏子进程控制台窗口，避免每轮 claude.exe 弹黑窗；非 Windows 为 0（无标志）
POPEN_CREATIONFLAGS = getattr(subprocess, "CREATE_NO_WINDOW", 0)

# Agent 选择：支持 "claude"（默认）或 "codex"
# 用法：python ralph.py [codex]
AGENT = sys.argv[1] if len(sys.argv) > 1 else "claude"


def resolve_executable(name: str) -> str:
    """
    在 Windows 上，很多 CLI 会以 .cmd/.bat 形式存在（例如 npm 全局安装的命令）。
    这里做一层兼容解析，避免 WinError 2。
    """
    path = shutil.which(name)
    if path:
        return path

    if os.name == "nt":
        for ext in (".cmd", ".exe", ".bat"):
            path = shutil.which(name + ext)
            if path:
                return path

    # 让上层捕获并打印更明确的错误信息
    raise FileNotFoundError(
        f"找不到可执行文件: {name}（请确认已安装且在 PATH 中，Windows 可能是 {name}.cmd）"
    )


def build_cmd(prompt: str) -> list[str]:
    """根据 AGENT 配置构建命令"""
    if AGENT == "codex":
        codex = resolve_executable("codex")
        return [codex, "exec", "--dangerously-bypass-approvals-and-sandbox", prompt]
    claude = resolve_executable("claude")
    return [claude, "--print", "--dangerously-skip-permissions", prompt]


def build_process_cmd(prompt: str) -> list[str]:
    """通过 script 提供 PTY，确保子进程输出实时显示到控制台"""
    # Windows 没有 script(1)，直接运行子命令即可
    if os.name == "nt":
        return build_cmd(prompt)
    return ["script", "-q", "/dev/null"] + build_cmd(prompt)

# 目录配置
SCRIPT_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = SCRIPT_DIR.parent.parent
CLAUDE_INSTRUCTION_FILE = SCRIPT_DIR / "CLAUDE.md"
VALIDATOR_INSTRUCTION_FILE = SCRIPT_DIR / "VALIDATOR.md"
PRD_FILE = SCRIPT_DIR / "prd.json"


def run_developer(iteration: int) -> bool:
    """
    调用开发 Agent
    返回值：是否超时
    """
    print(f"\n{'='*64}\n  迭代 {iteration}/{MAX_ITERATIONS}\n{'='*64}")

    if not CLAUDE_INSTRUCTION_FILE.exists():
        print(f"❌ 错误: {CLAUDE_INSTRUCTION_FILE} 不存在")
        return False

    file_content = CLAUDE_INSTRUCTION_FILE.read_text(encoding="utf-8")
    action_directive = "【执行任务指令】：利用你的工具读取当前目录下的 `prd.json` 和 `progress.txt`，立刻开始写代码并完成下一个未完成的 User Story。如果所有任务完成则正常退出。绝对不要进行闲聊或反问。\n\n=== 基础规则与上下文配置 ===\n"
    prompt = action_directive + file_content
    cmd = build_process_cmd(prompt)

    try:
        process = subprocess.Popen(
            cmd,
            cwd=str(PROJECT_ROOT),
            creationflags=POPEN_CREATIONFLAGS
        )

        start_time = time.time()

        while True:
            ret_code = process.poll()
            if ret_code is not None:
                print("\n✓ 开发迭代完成")
                return False

            elapsed_time = time.time() - start_time
            if elapsed_time > TIMEOUT_SECONDS:
                print(f"\n⚠️  开发 Agent 超时! 已运行 {int(elapsed_time)} 秒")
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
                print("   进程已终止，将在下一次迭代重试")
                return True

            time.sleep(60)

    except Exception as e:
        print(f"\n❌ 开发 Agent 错误: {e}")
        return False

def run_validator(iteration: int, current_story_id: str | None = None) -> None:
    """
    调用 Validator Agent，传入当前 story ID 以确保验证目标明确
    """
    print(f"\n{'='*64}\n  验证迭代 {iteration} - Validator 开始工作\n{'='*64}")

    if not VALIDATOR_INSTRUCTION_FILE.exists():
        print(f"⚠️  警告: {VALIDATOR_INSTRUCTION_FILE} 不存在，跳过验证")
        return

    file_content = VALIDATOR_INSTRUCTION_FILE.read_text(encoding="utf-8")
    story_hint = f"\n【当前需要验证的 Story ID 是：{current_story_id}】。即使 progress.txt 不存在或为空，也必须验证这个 story，绝不能中止。请直接读取 prd.json 找到该 story 并开始验证。\n" if current_story_id else ""
    action_directive = f"【执行验证任务指令】：利用你的工具去读取当前目录下的 `prd.json`（以及 `progress.txt`，如果存在的话），立刻按照规则对当前 story 进行验收测试（包括运行命令和浏览器测试截图）。千万不要反问或停止确认，遇到问题记录在 notes 字段。验证完成后直接退出。{story_hint}\n\n=== 基础规则与上下文配置 ===\n"
    prompt = action_directive + file_content
    cmd = build_process_cmd(prompt)

    try:
        process = subprocess.Popen(
            cmd,
            cwd=str(PROJECT_ROOT),
            creationflags=POPEN_CREATIONFLAGS
        )

        start_time = time.time()

        while True:
            ret_code = process.poll()
            if ret_code is not None:
                print("\n✓ 验证完成")
                return

            elapsed_time = time.time() - start_time
            if elapsed_time > TIMEOUT_SECONDS * 2:
                print(f"\n⚠️  Validator 超时! 已运行 {int(elapsed_time)} 秒")
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
                print("   Validator 进程已终止，跳过本次验证")
                return

            time.sleep(60)

    except Exception as e:
        print(f"\n❌ Validator 错误: {e}")
def get_current_story_id() -> str | None:
    """返回 prd.json 中第一个 passes=False 且 blocked=False 的 story ID"""
    try:
        prd = json.loads(PRD_FILE.read_text(encoding="utf-8"))
        for story in prd.get("userStories", []):
            if not story.get("passes", False) and not story.get("blocked", False):
                return story.get("id")
    except Exception:
        pass
    return None


def all_stories_resolved() -> bool:
    """
    检查 prd.json，判断是否所有 story 都已完成或被 blocked
    """
    try:
        prd = json.loads(PRD_FILE.read_text(encoding="utf-8"))
        stories = prd.get("userStories", [])
        for story in stories:
            passes = story.get("passes", False)
            blocked = story.get("blocked", False)
            if not passes and not blocked:
                return False
        return True
    except Exception as e:
        print(f"⚠️  读取 prd.json 失败: {e}")
        return False


def format_duration(seconds: float) -> str:
    """将秒数格式化为易读的时间字符串"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    if h > 0:
        return f"{h}小时 {m}分钟 {s}秒"
    elif m > 0:
        return f"{m}分钟 {s}秒"
    else:
        return f"{s}秒"


def main():
    """主函数"""
    print(f"启动 Ralph - 最大迭代次数: {MAX_ITERATIONS}")
    total_start_time = time.time()
    
    # 确保 screenshots 目录存在
    (PROJECT_ROOT / "screenshots").mkdir(exist_ok=True)

    dashboard.start(max_iterations=MAX_ITERATIONS)

    # 自动启动前端服务
    frontend_process = None
    frontend_dir = PROJECT_ROOT / "frontend"
    if frontend_dir.exists() and (frontend_dir / "package.json").exists():
        print("🌐 正在后台自动启动前端开发服务器...")
        try:
            frontend_process = subprocess.Popen(
                "npm run dev",
                cwd=str(frontend_dir),
                shell=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=POPEN_CREATIONFLAGS
            )
            time.sleep(3) # 等待启动完成
        except Exception as e:
            print(f"⚠️ 前端服务后台启动异常: {e}")

    for i in range(1, MAX_ITERATIONS + 1):
        try:
            # 第一步：调用开发 Agent
            current_story = get_current_story_id()
            dashboard.set_state(iteration=i, phase="developing", current_story=current_story)
            timed_out = run_developer(i)

            # 开发 Agent 超时，跳过 Validator，直接进入下一次迭代重试
            if timed_out:
                dashboard.set_state(phase="idle")
                print("⏭️  开发 Agent 超时，跳过验证，下一次迭代继续开发...")
                time.sleep(2)
                continue

            # 第二步：开发 Agent 正常完成，调用 Validator Agent
            dashboard.set_state(phase="validating")
            run_validator(i, current_story_id=current_story)

            # 第三步：检查是否全部完成（passes:true 或 blocked:true）
            dashboard.set_state(phase="idle")
            if all_stories_resolved():
                dashboard.set_state(phase="done")
                elapsed = time.time() - total_start_time
                print("✅ 所有任务已完成或已标记为 BLOCKED!")
                print(f"⏱️  总运行时间: {format_duration(elapsed)}")
                if frontend_process:
                    subprocess.run(f"taskkill /F /T /PID {frontend_process.pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                sys.exit(0)

        except KeyboardInterrupt:
            elapsed = time.time() - total_start_time
            print(f"\n\n⚠️  用户中断")
            print(f"⏱️  总运行时间: {format_duration(elapsed)}")
            if frontend_process:
                subprocess.run(f"taskkill /F /T /PID {frontend_process.pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            sys.exit(130)

    elapsed = time.time() - total_start_time
    print(f"\n已达到最大迭代次数 ({MAX_ITERATIONS})")
    print(f"⏱️  总运行时间: {format_duration(elapsed)}")
    if frontend_process:
        subprocess.run(f"taskkill /F /T /PID {frontend_process.pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    sys.exit(1)


if __name__ == "__main__":
    main()

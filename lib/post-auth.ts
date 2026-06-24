// 帖子编辑/删除鉴权：作者或管理员可改。
// 纯函数 —— 不查 DB，调用方负责传入当前用户的 isAdmin（来自 getCurrentUser）。

export function canEditPost(
  uid: number,
  post: { userId: number } | null,
  isAdmin: boolean,
): boolean {
  if (!post) return false;
  return isAdmin || post.userId === uid;
}

'use client';

import { useEffect } from 'react';

/**
 * 微信 JS-SDK 分享初始化。
 *
 * 只在微信内浏览器（MicroMessenger UA）加载 SDK + 初始化分享。
 * 非微信环境不加载任何额外资源，零性能影响。
 *
 * 使用方式：在 app/layout.tsx 的 body 底部引入 <WechatShareInit />。
 * 分享内容（标题/描述/链接/封面）从页面 meta 标签自动提取。
 */
export function WechatShareInit() {
  useEffect(() => {
    const ua = navigator.userAgent;
    if (!/MicroMessenger/i.test(ua)) return;

    // 动态加载微信 JS-SDK
    const script = document.createElement('script');
    script.src = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js';
    script.async = true;
    script.onload = async () => {
      const wx = (window as any).wx;
      if (!wx) return;

      const currentUrl = window.location.href.split('#')[0];

      try {
        const res = await fetch(`/api/wechat/signature?url=${encodeURIComponent(currentUrl)}`);
        if (!res.ok) return;
        const sig = await res.json();

        wx.config({
          debug: false,
          appId: sig.appId,
          timestamp: sig.timestamp,
          nonceStr: sig.nonceStr,
          signature: sig.signature,
          jsApiList: ['updateAppMessageShareData', 'updateTimelineShareData'],
        });

        wx.ready(() => {
          // 从页面 meta 提取标题/描述/封面
          const title =
            document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
            document.title ||
            'N.E.I. · PEVC AI Skill Hub';
          const desc =
            document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
            '一级市场投资人的 AI Skill Hub · 搜索 · 收藏 · MCP 调用';
          const link = currentUrl;
          const imgUrl =
            document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
            `${window.location.origin}/share-cover.png`;

          // 分享给朋友
          wx.updateAppMessageShareData({
            title,
            desc,
            link,
            imgUrl,
          });

          // 分享到朋友圈
          wx.updateTimelineShareData({
            title,
            link,
            imgUrl,
          });
        });

        wx.error((res: any) => {
          console.warn('[wechat-sdk] config error:', res.errMsg);
        });
      } catch (e) {
        console.warn('[wechat-sdk] init failed');
      }
    };

    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return null;
}

/**
 * LiquidGlassScene
 * ----------------
 * Claude 风格重做后的全局背景容器。
 *
 * 原先这里运行一整套 WebGL/canvas 着色器（焦散、指针高光、噪声、环境呼吸）
 * 并为玻璃卡片提供折射/色差所需的动态背景。现全部移除，仅保留一个
 * **纯静态 CSS 浅色渐变** 的 <div>：
 *   - position: fixed; inset: 0; z-index: -1  → 严格位于所有内容之下
 *   - 无任何 canvas / shader / animation / SVG 滤镜
 *
 * 这样既能提供干净、明亮、留白充足的 Claude 基调，又从根上保证了非定位
 * 文字（如首页「列表顺序」<span>）在任意部署（含 Vercel）下都可见——
 * 旧版不透明的 WebGL 画布曾压在非定位文本之上导致文字消失，该回归点已被根除。
 */

export default function LiquidGlassScene() {
  return <div className="liquid-scene" aria-hidden="true" />;
}

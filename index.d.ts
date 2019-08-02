export default class MCropper {
  /** 实例化时options参数的默认值，可以通过修改该对象的值影响后续的实例化 */
  static defaults: MCropperOption

  readonly container: string
  readonly src: string

  /**
   * 创建MCropper实例
   * @param {Element} container 一个宽度和高度都不为0的可定位元素
   * @param {string} [src] img src
   * @param {object} [options] 裁剪框配置
   * @param {boolean} [options.circle] 是否启用圆形裁剪框，圆形裁剪框会取裁剪框宽度为直径
   * @param {number} [options.width] 裁剪框宽度(px)
   * @param {number} [options.height] 裁剪框高度(px)
   * @param {number} [options.aspectRatio=1] 裁剪框宽高比，当没有同时指定宽高时起效
   * @param {number} [options.containRatio=0.92] 当裁剪框宽高都没有指定时，配合aspectRatio自动计算尺寸，以使其宽度和高度适应内容区域，该值控制缩比例(ratio <= 1)
   * @param {string} [options.borderColor='rgba(51, 153, 255, 0.75)'] 裁剪框边框颜色
   * @param {number} [options.borderWidth=1] 裁剪框边框宽度(px)
   * @param {number} [options.borderOrigin='out'] 裁剪框边框线绘制位置，out：框的外面，in：框的里面，middle：框的里外各绘制一半
   * @param {number} [options.modalOpacity=0.6] 蒙层不透明度
   * @param {ReadyCallback} [callbackfn] 有src时，该图片加载成功后执行回调
   * @example
   * new MCropper(cropperContainer, '/picture.png', function(cropper) {
   *   cropBtn.addEventListener('click', crop)
   *   function crop () {
   *     previewImg.src = cropper.crop().toDataURL('image/jpeg')
   *     previewImg.style.display = 'block'
   *     cropperContainer.style.display = 'none'
   *     cropBtn.removeEventListener('click', crop)
   *     cropper.destroy()
   *   }
   * })
   */
  constructor(container: Element, src?: string, options?: MCropperOption, callbackfn?: ReadyCallback)
  constructor(container: Element, src: string, callbackfn: ReadyCallback)
  constructor(container: Element, options: MCropperOption)

  /**
   * 裁剪
   * @param {number} [value=1]
   * @param {string} [attribute='ratio'] 指定value的意义：
   *   ratio: 基于裁剪框尺寸的输出倍率；
   *   naturalRatio: 基于图片原始尺寸的输出倍率；
   *   width: 给出宽度，自动计算高度；
   *   height: 给出高度，自动计算宽度；
   * @return {HTMLCanvasElement}
   */
  crop(value?: number, attribute?: 'ratio' | 'naturalRatio' | 'width' | 'height'): HTMLCanvasElement

  /**
   * 更新src（会清空当前回调队列）
   * @param {string} src
   * @param {ReadyCallback} [callbackfn] 图片加载成功后执行回调
   */
  setSrc(src: string, callbackfn?: ReadyCallback): void

  /**
   * 如果当前有已加载成功的图片时马上执行；否则注册至回调队列，在当前图片加载成功后按注册顺序执行
   * @param {ReadyCallback} callbackfn
   */
  onReady(callbackfn: ReadyCallback): void

  /**
   * 在container大小变化后调用以重绘canvas
   * @param {boolean} [reset] 是否在重绘后重置裁剪区域
   */
  resize(reset?: boolean): void

  /**
   * 计算裁剪数据
   * @return {number[]} 前2项：被剪切图像的裁剪起点的 x 坐标和 y 坐标；后2项：被剪切图像的宽度和高度
   */
  getImageData(): [number, number, number, number]

  /** 销毁实例 */
  destroy(): void
}

/**
 * 图片加载完毕后的回调
 * @callback ReadyCallback
 * @param {MCropper} instance
 */
interface ReadyCallback {
  (instance: MCropper): void
}

export interface MCropperOption {
  circle?: boolean
  width?: number
  height?: number
  aspectRatio?: number
  containRatio?: number
  modalOpacity?: number
  borderColor?: string
  borderWidth?: number
  borderOrigin?: 'out' | 'in' | 'middle'
}

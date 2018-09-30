# mcropper
> 要在移动端实现上传头像，本来采用`cropperjs`，开发完在手机上一跑，哭了。百度之，试用了一下`AlloyCrop`，流畅但是可定制性不强，遂改源码。改着改着就面目全非了，那就尝试发布第一款npm包吧。

## Features
* 只支持移动端
* 裁剪框大小自适应
* 初始化时图片有一边尺寸与裁剪框相等，另一边大于或等于裁剪框且居中
* 缩放图片时以双指中心为中点
* 无论移动或缩放，裁剪框始终不会超出图片外
* window.resize时自动重绘，并保持裁剪的区域不变

## Getting started
```js
class MCropper {
  /**
   * @param {Element} container 一个宽度和高度都不为0的可定位元素
   * @param {String} src img src
   * @param {Object} [options]
   * @param {Number} [options.width] 裁剪框宽度(px)
   * @param {Number} [options.height] 裁剪框高度(px)
   * @param {Number} [options.aspectRatio=1] 宽高比，当没有同时指定宽高时起效
   * @param {Number} [options.containRatio=0.92] 当没有指定宽高时，配合aspectRatio自动计算尺寸，以使其宽度和高度适应内容区域，该值控制缩比例(ratio <= 1)
   * @param {Boolean} [options.circle] 是否启用圆形裁剪框
   * @param {Function(cropper)} [options.onReady] 初始化成功的回调
   * @param {String} [options.borderColor='rgba(51, 153, 255, 0.75)'] 裁剪框边框颜色
   * @param {Number} [options.borderWidth=1] 裁剪框边框宽度(px)
   * @param {Number} [options.modalOpacity=0.6] 蒙层不透明度
   * @param {Boolean} [options.responsive=true] 是否在window.resize后重新渲染
   * @param {Boolean} [options.restore=true] 是否在window.resize重新渲染后保持当前裁剪区域不变
   */
  constructor(container, src, options) {}
  /**
   * 裁剪，下列可选参数有且只有一个发挥作用，由上往下优先级降低
   * @param {Object|Number} [options=1] 为数字时作用和options.ratio一样
   * @param {Number} [options.width] 给出宽度，自动计算高度
   * @param {Number} [options.height] 给出高度，自动计算宽度
   * @param {Number} [options.naturalRatio] 基于图片原始尺寸的输出倍率
   * @param {Number} [options.ratio] 基于裁剪框尺寸的输出倍率
   * @return {Canvas}
   */
  crop(options) {}
  /**
   * 注册初始化成功的回调
   * @param {Function(cropper)} callback 初始化成功后会按顺序执行回调（通过实例化时的options.onReady注册的优先级最高），初始化成功后注册的回调会直接执行
   */
  onReady(callback) {}
  /**
   * 回收资源，移除画布
   */
  destroy() {}
}
```

## Example
```js
new MCropper(container, img.src, {
  onReady(cropper) {
    confirmBtn.onclick = function () {
      preview.src = cropper.crop().toDataURL('image/png')
      confirmBtn.onclick = null
      cropper.destroy()
    }
  }
})
```

## Preview
![Preview](https://dgmpk.github.io/mcropper/public/preview.jpg)

## Demo
[https://dgmpk.github.io/mcropper/](https://dgmpk.github.io/mcropper/)

![QR code](https://dgmpk.github.io/mcropper/public/QR-code.png)

## Dependencies
* [AlloyFinger](https://github.com/AlloyTeam/AlloyFinger)

## License
This content is released under the [MIT](http://opensource.org/licenses/MIT) License.

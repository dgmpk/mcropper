import AlloyFinger from 'alloyfinger'

const NAMESPACE = '$$mcropper'

const DEFAULTS = {
  containRatio: 0.92,
  aspectRatio: 1,
  modalOpacity: 0.6,
  borderColor: 'rgba(51, 153, 255, 0.75)',
  borderWidth: 1,
  responsive: true,
  restore: true,
}

export default class MCropper {
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
  constructor(container, src, options) {
    if(container[NAMESPACE]) {
      container[NAMESPACE].destroy()
    }

    container[NAMESPACE] = this
    this.container = container
    this.containerWidth = container.clientWidth
    this.containerHeight = container.clientHeight

    this.options = options = assign({}, DEFAULTS, options)
    if(!options.width && !options.height) {
      if(options.containRatio > 1) {
        throw new Error('options.containRatio must be less than or equal to 1')
      }
      if(options.aspectRatio > container.clientWidth / container.clientHeight) {
        this.cropBoxWidth = container.clientWidth * options.containRatio
      } else {
        this.cropBoxHeight = container.clientHeight * options.containRatio
      }
    } else {
      if(options.width) {
        this.cropBoxWidth = options.width
      }
      if(options.height) {
        this.cropBoxHeight = options.height
      }
    }
    if(!this.cropBoxHeight) {
      this.cropBoxHeight = this.cropBoxWidth / options.aspectRatio
    }
    if(!this.cropBoxWidth) {
      this.cropBoxWidth = this.cropBoxHeight * options.aspectRatio
    }
    if(this.cropBoxWidth !== this.cropBoxHeight && options.circle) {
      throw new Error('can\'t set options.circle to true when width is not equal to height')
    }
    this.imgOriginX = (this.containerWidth - this.cropBoxWidth) / 2
    this.imgOriginY = (this.containerHeight - this.cropBoxHeight) / 2

    this.canvas = document.createElement('canvas')
    assign(this.canvas.style, {
      position: 'absolute',
      zIndex: '1',
      top: '0px',
      left: '0px'
    })
    this.canvas.width = this.containerWidth
    this.canvas.height = this.containerHeight
    this.ctx = this.canvas.getContext('2d')

    this.callbacks = []
    options.onReady && this.callbacks.push(options.onReady)

    this.img = new Image()
    if(src.substring(0, 4).toLowerCase() === 'http') {
      // resolve base64 uri bug in safari:'cross-origin image load denied by cross-origin resource sharing policy.'
      this.img.crossOrigin = 'anonymous'
    }
    this.img.onload = () => this.init()
    this.img.src = src
  }
  init() {
    this.container.appendChild(this.canvas)
    this.imgWidth = this.img.naturalWidth
    this.imgHeight = this.img.naturalHeight
    this.imgOriginScale = Math.max(this.cropBoxWidth / this.imgWidth, this.cropBoxHeight / this.imgHeight)
    this.renderCenter()
    this.addFingerListener()
    if(this.options.responsive) {
      this.resizeListener = this.resize.bind(this)
      window.addEventListener('resize', this.resizeListener)
    }
    this.ready = true
    let callback
    while ((callback = this.callbacks.shift())) {
      callback(this)
    }
  }
  renderCenter() {
    this.render(
      (this.imgWidth * this.imgOriginScale - this.cropBoxWidth) / 2,
      (this.imgHeight * this.imgOriginScale - this.cropBoxHeight) / 2,
      this.imgOriginScale
    )
  }
  render(imgStartX, imgStartY, imgScale) {
    this.clearCavnvas()
    this.renderCover()
    this.renderCropBox()
    this.renderImage(imgStartX, imgStartY, imgScale)
  }
  clearCavnvas() {
    const ctx = this.ctx
    ctx.save()
    ctx.globalCompositeOperation = 'copy'
    ctx.globalAlpha = 0
    ctx.fillRect(0, 0, this.containerWidth, this.containerHeight)
    ctx.restore()
  }
  /**
   * @param  {Number} imgStartX 裁剪框左上角在图片尺寸坐标系统上的x坐标
   * @param  {Number} imgStartY 裁剪框左上角在图片尺寸坐标系统上的y坐标
   */
  renderImage(imgStartX, imgStartY, imgScale) {
    imgScale = Math.max(imgScale, this.imgOriginScale)
    if(imgScale !== this.imgScale) {
      // 如果要缩放，先计算新的imgStartCoordRange，再修正imgStartCoord保证不越界
      const {
        cropBoxWidth,
        cropBoxHeight,
        imgWidth,
        imgHeight,
      } = this
      this.imgScale = imgScale
      this.imgMaxOffsetX = imgWidth * imgScale - cropBoxWidth
      this.imgMaxOffsetY = imgHeight * imgScale - cropBoxHeight
    }
    this.imgStartX = limitRange(imgStartX, [0, this.imgMaxOffsetX])
    this.imgStartY = limitRange(imgStartY, [0, this.imgMaxOffsetY])
    this.ctx.save()
    this.ctx.globalCompositeOperation = 'destination-over'
    this.ctx.drawImage(
      this.img,
      this.imgOriginX - this.imgStartX,
      this.imgOriginY - this.imgStartY,
      this.imgWidth * imgScale,
      this.imgHeight * imgScale
    )
    this.ctx.restore()
  }
  renderCover() {
    const ctx = this.ctx
    ctx.save()
    ctx.fillStyle = 'black'
    ctx.globalAlpha = this.options.modalOpacity
    ctx.fillRect(0, 0, this.containerWidth, this.containerHeight)
    ctx.restore()
  }
  renderCropBox() {
    const {
      ctx,
      cropBoxWidth,
      cropBoxHeight,
      containerWidth,
      containerHeight,
    } = this
    const drawCropBox = this.options.circle
      ? spread => ctx.arc(
        containerWidth / 2,
        containerHeight / 2,
        cropBoxWidth / 2 + spread / 2,
        0,
        Math.PI * 2,
        false
      )
      : spread => ctx.rect(
        containerWidth / 2 - cropBoxWidth / 2 - spread / 2,
        containerHeight / 2 - cropBoxHeight / 2 - spread / 2,
        cropBoxWidth + spread,
        cropBoxHeight + spread
      )

    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    drawCropBox(0)
    ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.beginPath()
    ctx.strokeStyle = this.options.borderColor
    ctx.lineWidth = this.options.borderWidth
    // 笔触线条在绘制的图形的内部，修正至外面
    drawCropBox(ctx.lineWidth)
    ctx.stroke()
    ctx.restore()
  }
  zoomImage(scale, centerXOnImage, centerYOnImage, centerXOnContainer, centerYOnContainer) {
    scale = Math.max(this.imgOriginScale, scale)
    // 以缩放后的centerCoordOnImage和centerCoordOnContainer重合为前提计算的新的imgStartCoord
    const zoom = scale / this.imgScale
    centerXOnImage *= zoom
    centerYOnImage *= zoom
    const imgStartX = this.imgOriginX - (centerXOnContainer - centerXOnImage)
    const imgStartY = this.imgOriginY - (centerYOnContainer - centerYOnImage)
    this.render(imgStartX, imgStartY, scale)
  }
  addFingerListener() {
    let tempScale = 0
    let centerXOnContainer = null
    let centerYOnContainer = null
    this.alloyFinger = new AlloyFinger(this.canvas, {
      multipointStart: e => {
        const [t1, t2] = e.touches
        const centerPageX = (t1.pageX + t2.pageX) / 2
        const centerPageY = (t1.pageY + t2.pageY) / 2;
        [centerXOnContainer, centerYOnContainer] = pageCoord2ElementCoord(this.container, centerPageX, centerPageY)
        tempScale = this.imgScale
      },
      pinch: e => {
        // 将在container坐标系上的坐标换算到img
        const centerXOnImage = centerXOnContainer - (this.imgOriginX - this.imgStartX)
        const centerYOnImage = centerYOnContainer - (this.imgOriginY - this.imgStartY)
        this.zoomImage(tempScale * e.zoom, centerXOnImage, centerYOnImage, centerXOnContainer, centerYOnContainer)
      },
      pressMove: e => {
        e.preventDefault()
        this.render(this.imgStartX - e.deltaX, this.imgStartY - e.deltaY, this.imgScale)
      }
    })
  }
  resetSize() {
    this.containerWidth = this.canvas.width = this.container.clientWidth
    this.containerHeight = this.canvas.height = this.container.clientHeight
    const {
      width,
      height,
      aspectRatio,
      containRatio,
    } = this.options
    if(!width && !height) {
      if(aspectRatio > this.containerWidth / this.containerHeight) {
        this.cropBoxWidth = this.containerWidth * containRatio
        this.cropBoxHeight = this.cropBoxWidth / aspectRatio
      } else {
        this.cropBoxHeight = this.containerHeight * containRatio
        this.cropBoxWidth = this.cropBoxHeight * aspectRatio
      }
    }
    this.imgOriginX = (this.containerWidth - this.cropBoxWidth) / 2
    this.imgOriginY = (this.containerHeight - this.cropBoxHeight) / 2
    this.imgOriginScale = Math.max(this.cropBoxWidth / this.imgWidth, this.cropBoxHeight / this.imgHeight)
  }
  resize() {
    if(this.options.restore) {
      const [
        imgStartXNatural,
        imgStartYNatural
      ] = this.getImageData()
      const zoom = this.imgScale / this.imgOriginScale
      this.resetSize()
      const imgScale = this.imgOriginScale * zoom
      this.render(
        imgStartXNatural * imgScale,
        imgStartYNatural * imgScale,
        imgScale
      )
    } else {
      this.resetSize()
      this.renderCenter()
    }
  }
  getImageData() {
    const scale = this.imgScale
    return [
      this.imgStartX / scale,
      this.imgStartY / scale,
      this.cropBoxWidth / scale,
      this.cropBoxHeight / scale
    ]
  }
  /**
   * 裁剪，下列可选参数有且只有一个发挥作用，由上往下优先级降低
   * @param {Object|Number} [options=1] 为数字时作用和options.ratio一样
   * @param {Number} [options.width] 给出宽度，自动计算高度
   * @param {Number} [options.height] 给出高度，自动计算宽度
   * @param {Number} [options.naturalRatio] 基于图片原始尺寸的输出倍率
   * @param {Number} [options.ratio] 基于裁剪框尺寸的输出倍率
   * @return {Canvas}
   */
  crop(options) {
    if(!this.ready) {
      throw new Error('can\'t crop before ready')
    }
    options = options || 1
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const aspectRatio = this.cropBoxWidth / this.cropBoxHeight
    const imageData = this.getImageData()
    if(options.width) {
      canvas.width = options.width
      canvas.height = options.width * aspectRatio
    } else if(options.height) {
      canvas.height = options.height
      canvas.width = options.width / aspectRatio
    } else if(options.naturalRatio) {
      canvas.width = imageData[2] * options.naturalRatio
      canvas.height = imageData[3] * options.naturalRatio
    } else {
      const outputRatio = options.outputRatio || Number(options)
      canvas.width = this.cropBoxWidth * outputRatio
      canvas.height = this.cropBoxHeight * outputRatio
    }
    ctx.drawImage(
      this.img,
      imageData[0],
      imageData[1],
      imageData[2],
      imageData[3],
      0,
      0,
      canvas.width,
      canvas.height
    )
    return canvas
  }
  /**
   * 注册初始化成功的回调
   * @param {Function(cropper)} callback 初始化成功后会按顺序执行回调（通过实例化时的options.onReady注册的优先级最高），初始化成功后注册的回调会直接执行
   */
  onReady(callback) {
    if(this.ready === true) {
      callback(this)
    } else {
      this.callbacks.push(callback)
    }
  }
  /**
   * 回收资源，移除画布
   */
  destroy() {
    this.callbacks = []
    this.alloyFinger.destroy()
    window.removeEventListener('resize', this.resizeListener)
    this.container.removeChild(this.canvas)
    this.container.$$mcropper = null
  }
}

function limitRange(val, [min, max]) {
  return val < min ? min : val > max ? max : val
}

/**
 * 把相对于页面定位的坐标转换相对于元素的坐标
 */
function pageCoord2ElementCoord(el, pageX, pageY) {
  const {
    top,
    left
  } = el.getBoundingClientRect()
  return [pageX - left, pageY - top]
}

function assign(object, ...sources) {
  sources.forEach(source => {
    for (var variable in source) {
      if (source.hasOwnProperty(variable)) {
        object[variable] = source[variable]
      }
    }
  })
  return object
}

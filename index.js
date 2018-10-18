import AlloyFinger from 'alloyfinger'

const NAMESPACE = '$$mcropper'

const defaults = {
  containRatio: 0.92,
  aspectRatio: 1,
  modalOpacity: 0.6,
  borderColor: 'rgba(51, 153, 255, 0.75)',
  borderWidth: 1,
  borderOrigin: 'out',
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
   * @param {Boolean} [options.circle] 是否启用圆形裁剪框，取裁剪框宽度为直径
   * @param {Function(cropper)} [options.onReady] 初始化成功的回调
   * @param {String} [options.borderColor='rgba(51, 153, 255, 0.75)'] 裁剪框边框颜色
   * @param {Number} [options.borderWidth=1] 裁剪框边框宽度(px)
   * @param {Number} [options.borderOrigin=out] 裁剪框边框线绘制位置，out：框的外面，in：框的里面，middle：框的里外各绘制一半
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

    this.options = assign({}, MCropper.defaults, options)
    const {
      width,
      height,
      aspectRatio
    } = this.options
    if(width || height) {
      if(width) {
        this.cropBoxWidth = width
      }
      if(height) {
        this.cropBoxHeight = height
      }
      if(!this.cropBoxHeight) {
        this.cropBoxHeight = this.cropBoxWidth / aspectRatio
      }
      if(!this.cropBoxWidth) {
        this.cropBoxWidth = this.cropBoxHeight * aspectRatio
      }
    }

    this.canvas = document.createElement('canvas')
    assign(this.canvas.style, {
      position: 'absolute',
      zIndex: '1',
      top: '0',
      left: '0'
    })
    this.ctx = this.canvas.getContext('2d')
    this.drawCropBox = this.options.circle
      ? spread => this.ctx.arc(
        this.container.clientWidth / 2,
        this.container.clientHeight / 2,
        this.cropBoxWidth / 2 + spread / 2,
        0,
        Math.PI * 2,
        false
      )
      : spread => this.ctx.rect(
        this.container.clientWidth / 2 - this.cropBoxWidth / 2 - spread / 2,
        this.container.clientHeight / 2 - this.cropBoxHeight / 2 - spread / 2,
        this.cropBoxWidth + spread,
        this.cropBoxHeight + spread
      )

    this.callbacks = []
    options.onReady && this.callbacks.push(options.onReady)

    this.img = new Image()
    if(src.substring(0, 4).toLowerCase() === 'http') {
      // resolve base64 uri bug in safari:'cross-origin image load denied by cross-origin resource sharing policy.'
      this.img.crossOrigin = 'anonymous'
    }
    this.img.onload = this.init.bind(this)
    this.img.src = src
  }
  init() {
    this.container.appendChild(this.canvas)
    this.initData()
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
  initData() {
    const containerWidth = this.canvas.width = this.container.clientWidth
    const containerHeight = this.canvas.height = this.container.clientHeight
    const {
      width,
      height,
      aspectRatio,
      containRatio,
    } = this.options
    if(!width && !height) {
      if(aspectRatio > containerWidth / containerHeight) {
        this.cropBoxWidth = containerWidth * containRatio
        this.cropBoxHeight = this.cropBoxWidth / aspectRatio
      } else {
        this.cropBoxHeight = containerHeight * containRatio
        this.cropBoxWidth = this.cropBoxHeight * aspectRatio
      }
    }
    this.imgOriginX = (containerWidth - this.cropBoxWidth) / 2
    this.imgOriginY = (containerHeight - this.cropBoxHeight) / 2
    this.imgMinScale = Math.max(
      this.cropBoxWidth / this.img.naturalWidth,
      this.cropBoxHeight / this.img.naturalHeight
    )
  }
  renderCenter() {
    const imgScale = this.imgMinScale
    this.render(
      this.imgOriginX - (this.img.naturalWidth * imgScale - this.cropBoxWidth) / 2,
      this.imgOriginY - (this.img.naturalHeight * imgScale - this.cropBoxHeight) / 2,
      imgScale
    )
  }
  render(imgX, imgY, imgScale) {
    this.renderCover()
    this.renderImage(imgX, imgY, imgScale)
  }
  renderCover() {
    const {
      ctx,
      options: {
        modalOpacity,
        borderColor,
        borderWidth,
        borderOrigin
      }
    } = this

    // renderShadow
    ctx.save()
    ctx.globalCompositeOperation = 'copy' // clear old
    ctx.globalAlpha = modalOpacity
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, this.container.clientWidth, this.container.clientHeight)
    ctx.restore()

    const spread = borderOrigin === 'out'
      ? borderWidth
      : borderOrigin === 'in'
        ? -borderWidth
        : 0

    // strokeCropBox
    ctx.save()
    ctx.beginPath()
    ctx.globalCompositeOperation = 'destination-out' // 裁剪阴影的一部分
    this.drawCropBox(spread + borderWidth) // 加大裁剪部分的面积，使边框线不会重叠在阴影上方
    ctx.fill()
    ctx.restore()

    // renderCropBoxBorder
    ctx.save()
    ctx.beginPath()
    ctx.strokeStyle = borderColor
    ctx.lineWidth = borderWidth
    this.drawCropBox(spread)
    ctx.stroke()
    ctx.restore()
  }
  renderImage(imgX, imgY, imgScale) {
    imgScale = Math.max(imgScale, this.imgMinScale)
    if(imgScale !== this.imgScale) {
      // 如果要缩放，先计算新的imgStartCoordsRange，再修正imgStartCoords保证不越界
      this.imgScale = imgScale
      this.imgWidth = this.img.naturalWidth * imgScale
      this.imgHeight = this.img.naturalHeight * imgScale
      const imgMaxOffsetX = this.imgWidth - this.cropBoxWidth
      const imgMaxOffsetY = this.imgHeight - this.cropBoxHeight
      this.imgXRange = [this.imgOriginX - imgMaxOffsetX, this.imgOriginX]
      this.imgYRange = [this.imgOriginY - imgMaxOffsetY, this.imgOriginY]
    }
    this.imgX = limitRange(imgX, this.imgXRange)
    this.imgY = limitRange(imgY, this.imgYRange)

    const ctx = this.ctx
    ctx.save()
    ctx.globalCompositeOperation = 'destination-over'
    ctx.drawImage(
      this.img,
      this.imgX,
      this.imgY,
      this.imgWidth,
      this.imgHeight
    )
    ctx.restore()
  }
  zoomImage(scale, [relativeXOfImage, relativeYOfImage], [relativeXOfContainer, relativeYOfContainer]) {
    scale = Math.max(this.imgMinScale, scale)
    // 以缩放后的coordsOfImage和coordsOfContainer重合为前提计算的新的imgStartCoords
    const zoom = scale / this.imgScale
    relativeXOfImage *= zoom
    relativeYOfImage *= zoom
    this.render(relativeXOfContainer - relativeXOfImage, relativeYOfContainer - relativeYOfImage, scale)
  }
  addFingerListener() {
    let tempScale = 0
    let tempRelativeCoordsOfImage = [0, 0]
    // 获取两指之间的中点在container中的坐标
    const getRelativeCoordsOfContainerOnCenter = e => {
      const [t1, t2] = e.touches
      const pageX = (t1.pageX + t2.pageX) / 2
      const pageY = (t1.pageY + t2.pageY) / 2
      const {
        top,
        left
      } = this.container.getBoundingClientRect()
      return [pageX - left, pageY - top]
    }
    // 将在container坐标系上的坐标换算到img
    const updateTempRelativeCoordsOfImage = ([relativeXOfContainer, relativeYOfContainer]) => {
      tempRelativeCoordsOfImage = [
        relativeXOfContainer - this.imgX,
        relativeYOfContainer - this.imgY
      ]
    }
    this.alloyFinger = new AlloyFinger(this.canvas, {
      multipointStart: e => {
        tempScale = this.imgScale
        updateTempRelativeCoordsOfImage(getRelativeCoordsOfContainerOnCenter(e))
      },
      pinch: e => {
        const relativeCoordsOfContainer = getRelativeCoordsOfContainerOnCenter(e)
        this.zoomImage(tempScale * e.zoom, tempRelativeCoordsOfImage, relativeCoordsOfContainer)
        updateTempRelativeCoordsOfImage(relativeCoordsOfContainer)
      },
      pressMove: e => {
        e.preventDefault()
        this.render(this.imgX + e.deltaX, this.imgY + e.deltaY, this.imgScale)
      }
    })
  }
  resize() {
    if(this.options.restore) {
      const [
        naturalImgStartX,
        naturalImgStartY
      ] = this.getImageData()
      const zoom = this.imgScale / this.imgMinScale
      this.initData()
      const imgScale = this.imgMinScale * zoom
      this.render(
        this.imgOriginX - naturalImgStartX * imgScale,
        this.imgOriginY - naturalImgStartY * imgScale,
        imgScale
      )
    } else {
      this.initData()
      this.renderCenter()
    }
  }
  getImageData() {
    const scale = this.imgScale
    return [
      (this.imgOriginX - this.imgX) / scale,
      (this.imgOriginY - this.imgY) / scale,
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

MCropper.defaults = defaults

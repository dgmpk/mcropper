import AlloyFinger from 'alloyfinger'

const NAMESPACE = '__MCropper__'

const defaults = {
  aspectRatio: 1,
  containRatio: 0.92,
  modalOpacity: 0.6,
  borderColor: 'rgba(51, 153, 255, 0.75)',
  borderWidth: 1,
  borderOrigin: 'out',
}

export default class MCropper {
  constructor(container, src, options, callbackfn) {
    if (container[NAMESPACE]) {
      container[NAMESPACE].destroy()
    }
    container[NAMESPACE] = this
    this.container = container

    if (typeof src === 'object') {
      options = src
      src = null
    } else if (typeof options === 'function') {
      callbackfn = options
      options = null
    }
    this.options = assign({}, MCropper.defaults, options)

    // try to calculate fixed size of crop box if width or height has provided
    const {
      width,
      height,
      aspectRatio
    } = this.options
    if (width || height) {
      if (width) {
        this.cropBoxWidth = width
      }
      if (height) {
        this.cropBoxHeight = height
      }
      if (!this.cropBoxHeight) {
        this.cropBoxHeight = this.cropBoxWidth / aspectRatio
      }
      if (!this.cropBoxWidth) {
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
    this.container.appendChild(this.canvas)

    this.img = new Image()
    src && this.setSrc(src, callbackfn)
  }
  setSrc(src, callbackfn) {
    this.alloyFingerListener && this.alloyFingerListener.destroy()
    this.ready = false
    this.src = src
    this.callbackfns = []
    callbackfn && this.callbackfns.push(callbackfn)
    if (src.substring(0, 4).toLowerCase() === 'http') {
      // resolve base64 uri bug in safari:'cross-origin image load denied by cross-origin resource sharing policy.'
      this.img.crossOrigin = 'anonymous'
    }
    this.img.onload = this.init.bind(this)
    this.img.src = src
  }
  init() {
    this.ready = true
    this.calculateImgData()
    this.renderCenter()
    let callback
    while ((callback = this.callbackfns.shift())) {
      callback(this)
    }
    this.addFingerListener()
  }
  calculateImgData() {
    const containerWidth = this.canvas.width = this.container.clientWidth
    const containerHeight = this.canvas.height = this.container.clientHeight
    const {
      width,
      height,
      aspectRatio,
      containRatio,
    } = this.options
    if (!width && !height) {
      if (aspectRatio > containerWidth / containerHeight) {
        this.cropBoxWidth = containerWidth * containRatio
        this.cropBoxHeight = this.cropBoxWidth / aspectRatio
      } else {
        this.cropBoxHeight = containerHeight * containRatio
        this.cropBoxWidth = this.cropBoxHeight * aspectRatio
      }
    }
    this.cropBoxOriginX = (containerWidth - this.cropBoxWidth) / 2
    this.cropBoxOriginY = (containerHeight - this.cropBoxHeight) / 2
    this.imgMinScale = Math.max(
      this.cropBoxWidth / this.img.naturalWidth,
      this.cropBoxHeight / this.img.naturalHeight
    )
  }
  renderCenter() {
    const imgScale = this.imgMinScale
    this.render(
      this.cropBoxOriginX - (this.img.naturalWidth * imgScale - this.cropBoxWidth) / 2,
      this.cropBoxOriginY - (this.img.naturalHeight * imgScale - this.cropBoxHeight) / 2,
      imgScale
    )
  }
  render(imgOriginX, imgOriginY, imgScale) {
    this.renderCover()
    this.renderImage(imgOriginX, imgOriginY, imgScale)
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
  renderImage(imgOriginX, imgOriginY, imgScale) {
    imgScale = Math.max(imgScale, this.imgMinScale)

    // 根据缩放计算一个img起点坐标范围来限制img起点坐标的取值范围，以保证图片始终比裁剪框大
    if (imgScale !== this.imgScale) {
      this.imgScale = imgScale
      this.imgWidth = this.img.naturalWidth * imgScale
      this.imgHeight = this.img.naturalHeight * imgScale
      const imgMaxOffsetX = this.imgWidth - this.cropBoxWidth
      const imgMaxOffsetY = this.imgHeight - this.cropBoxHeight
      this.imgOriginXRange = [this.cropBoxOriginX - imgMaxOffsetX, this.cropBoxOriginX]
      this.imgOriginYRange = [this.cropBoxOriginY - imgMaxOffsetY, this.cropBoxOriginY]
    }
    this.imgOriginX = limitRange(imgOriginX, this.imgOriginXRange)
    this.imgOriginY = limitRange(imgOriginY, this.imgOriginYRange)

    const ctx = this.ctx
    ctx.save()
    ctx.globalCompositeOperation = 'destination-over'
    ctx.drawImage(
      this.img,
      this.imgOriginX,
      this.imgOriginY,
      this.imgWidth,
      this.imgHeight
    )
    ctx.restore()
  }

  /**
   * 缩放（始终以多指触点的中点缩放，所以可能会同时带有平移）
   * @param {number} scale
   * @param {[number, number]} param1 缩放前的中点在image坐标系的坐标
   * @param {[number, number]} param2 缩放后的中点在container坐标系的坐标
   */
  zoomImage(scale, [ix, iy], [cx, cy]) {
    scale = Math.max(this.imgMinScale, scale)
    const zoom = scale / this.imgScale
    this.render(cx - ix * zoom, cy - iy * zoom, scale)
  }
  pagePointToContainerPoint([pageX, pageY]) {
    const {
      top,
      left
    } = this.container.getBoundingClientRect()
    return [pageX - left, pageY - top]
  }
  containerPointToImagePoint([cx, cy]) {
    return [cx - this.imgOriginX, cy - this.imgOriginY]
  }
  addFingerListener() {
    let initialImgScale
    let centerOfGravityOnImage
    const getCenterOfGravityOnContainer = event => {
      const points = [].slice.apply(event.touches).map(touch => [touch.pageX, touch.pageY])
      let centerOfGravity
      if (points.length === 1) {
        centerOfGravity = points[0]
      } else if (points.length === 2) {
        centerOfGravity = [(points[0][0] + points[1][0]) / 2, (points[0][1] + points[1][1]) / 2]
      } else {
        centerOfGravity = getCenterOfGravity(points)
      }
      return this.pagePointToContainerPoint(centerOfGravity)
    }
    const updateCenterOfGravityOnImage = containerPoint => {
      centerOfGravityOnImage = this.containerPointToImagePoint(containerPoint)
    }
    this.alloyFingerListener = new AlloyFinger(this.canvas, {
      multipointStart: e => {
        initialImgScale = this.imgScale
        updateCenterOfGravityOnImage(getCenterOfGravityOnContainer(e))
      },
      pinch: e => {
        const newCenterOfGravityOnContainer = getCenterOfGravityOnContainer(e)
        this.zoomImage(initialImgScale * e.zoom, centerOfGravityOnImage, newCenterOfGravityOnContainer)
        updateCenterOfGravityOnImage(newCenterOfGravityOnContainer)
      },
      pressMove: e => {
        e.preventDefault()
        this.render(this.imgOriginX + e.deltaX, this.imgOriginY + e.deltaY, this.imgScale)
      }
    })
  }
  resize(reset) {
    if (reset) {
      this.calculateImgData()
      this.renderCenter()
    } else {
      const [
        sx,
        sy
      ] = this.getImageData()
      const zoom = this.imgScale / this.imgMinScale
      this.calculateImgData()
      const imgScale = this.imgMinScale * zoom
      this.render(
        this.cropBoxOriginX - sx * imgScale,
        this.cropBoxOriginY - sy * imgScale,
        imgScale
      )
    }
  }
  getImageData() {
    const scale = this.imgScale
    return [
      (this.cropBoxOriginX - this.imgOriginX) / scale, // 被剪切图像的裁剪起点的 x 坐标
      (this.cropBoxOriginY - this.imgOriginY) / scale, // 被剪切图像的裁剪起点的 y 坐标
      this.cropBoxWidth / scale, // 被剪切图像的宽度
      this.cropBoxHeight / scale // 被剪切图像的高度
    ]
  }
  crop(value = 1, attribute = 'ratio') {
    if (!this.ready) {
      throw new Error('can\'t crop before ready')
    }
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const aspectRatio = this.cropBoxWidth / this.cropBoxHeight
    const imageData = this.getImageData()
    switch (attribute) {
      case 'width':
        canvas.width = value
        canvas.height = value * aspectRatio
        break;
      case 'height':
        canvas.height = value
        canvas.width = value / aspectRatio
        break;
      case 'naturalRatio':
        canvas.width = imageData[2] * value
        canvas.height = imageData[3] * value
        break;
      default:
        canvas.width = this.cropBoxWidth * value
        canvas.height = this.cropBoxHeight * value
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
  onReady(callback) {
    if (this.ready === true) {
      callback(this)
    } else {
      this.callbackfns.push(callback)
    }
  }
  destroy() {
    this.img.src = this.img.onload = null
    this.alloyFingerListener && this.alloyFingerListener.destroy()
    this.container.removeChild(this.canvas)
    delete this.container[NAMESPACE]
  }
}

function limitRange(val, [min, max]) {
  return val < min ? min : val > max ? max : val
}

function assign(object, ...sources) {
  sources.forEach(source => {
    for (const variable in source) {
      if (source.hasOwnProperty(variable)) {
        object[variable] = source[variable]
      }
    }
  })
  return object
}

function getCenterOfGravity(points) {
  const len = points.length
  let area = 0
  let x = 0
  let y = 0

  for (let index = 1; index <= len; index++) {
    const [nx, ny] = points[index % len]
    const [lx, ly] = points[index - 1]
    const temp = (nx * ly - ny * lx) / 2
    area += temp
    x += temp * (nx + lx) / 3
    y += temp * (ny + ly) / 3
  }
  x = x / area
  y = y / area
  return [x, y]
}

MCropper.defaults = defaults

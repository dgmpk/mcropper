/*!
 * MCropper.js v1.0.0
 * undefined
 *
 * Copyright 2018-present dgmpk
 * Released under the MIT license
 *
 * Date: 2018-09-29T15:22:13.876Z
 */

import AlloyFinger from 'alloyfinger';

var NAMESPACE = '$$mcropper';

var DEFAULTS = {
  containRatio: 0.92,
  aspectRatio: 1,
  modalOpacity: 0.6,
  borderColor: 'rgba(51, 153, 255, 0.75)',
  borderWidth: 1,
  responsive: true,
  restore: true,
};

var MCropper = function MCropper(container, src, options) {
  var this$1 = this;

  if(container[NAMESPACE]) {
    container[NAMESPACE].destroy();
  }

  container[NAMESPACE] = this;
  this.container = container;
  this.containerWidth = container.clientWidth;
  this.containerHeight = container.clientHeight;

  this.options = options = assign({}, DEFAULTS, options);
  if(!options.width && !options.height) {
    if(options.containRatio > 1) {
      throw new Error('options.containRatio must be less than or equal to 1')
    }
    if(options.aspectRatio > container.clientWidth / container.clientHeight) {
      this.cropBoxWidth = container.clientWidth * options.containRatio;
    } else {
      this.cropBoxHeight = container.clientHeight * options.containRatio;
    }
  } else {
    if(options.width) {
      this.cropBoxWidth = options.width;
    }
    if(options.height) {
      this.cropBoxHeight = options.height;
    }
  }
  if(!this.cropBoxHeight) {
    this.cropBoxHeight = this.cropBoxWidth / options.aspectRatio;
  }
  if(!this.cropBoxWidth) {
    this.cropBoxWidth = this.cropBoxHeight * options.aspectRatio;
  }
  if(this.cropBoxWidth !== this.cropBoxHeight && options.circle) {
    throw new Error('can\'t set options.circle to true when width is not equal to height')
  }
  this.imgOriginX = (this.containerWidth - this.cropBoxWidth) / 2;
  this.imgOriginY = (this.containerHeight - this.cropBoxHeight) / 2;

  this.canvas = document.createElement('canvas');
  assign(this.canvas.style, {
    position: 'absolute',
    zIndex: '1',
    top: '0px',
    left: '0px'
  });
  this.canvas.width = this.containerWidth;
  this.canvas.height = this.containerHeight;
  this.ctx = this.canvas.getContext('2d');

  this.callbacks = [];
  options.onReady && this.callbacks.push(options.onReady);

  this.img = new Image();
  if(src.substring(0, 4).toLowerCase() === 'http') {
    // resolve base64 uri bug in safari:'cross-origin image load denied by cross-origin resource sharing policy.'
    this.img.crossOrigin = 'anonymous';
  }
  this.img.onload = function () { return this$1.init(); };
  this.img.src = src;
};
MCropper.prototype.init = function init () {
    var this$1 = this;

  this.container.appendChild(this.canvas);
  this.imgWidth = this.img.naturalWidth;
  this.imgHeight = this.img.naturalHeight;
  this.imgOriginScale = Math.max(this.cropBoxWidth / this.imgWidth, this.cropBoxHeight / this.imgHeight);
  this.renderCenter();
  this.addFingerListener();
  if(this.options.responsive) {
    this.resizeListener = this.resize.bind(this);
    window.addEventListener('resize', this.resizeListener);
  }
  this.ready = true;
  var callback;
  while ((callback = this.callbacks.shift())) {
    callback(this$1);
  }
};
MCropper.prototype.renderCenter = function renderCenter () {
  this.render(
    (this.imgWidth * this.imgOriginScale - this.cropBoxWidth) / 2,
    (this.imgHeight * this.imgOriginScale - this.cropBoxHeight) / 2,
    this.imgOriginScale
  );
};
MCropper.prototype.render = function render (imgStartX, imgStartY, imgScale) {
  this.clearCavnvas();
  this.renderCover();
  this.renderCropBox();
  this.renderImage(imgStartX, imgStartY, imgScale);
};
MCropper.prototype.clearCavnvas = function clearCavnvas () {
  var ctx = this.ctx;
  ctx.save();
  ctx.globalCompositeOperation = 'copy';
  ctx.globalAlpha = 0;
  ctx.fillRect(0, 0, this.containerWidth, this.containerHeight);
  ctx.restore();
};
/**
 * @param{Number} imgStartX 裁剪框左上角在图片尺寸坐标系统上的x坐标
 * @param{Number} imgStartY 裁剪框左上角在图片尺寸坐标系统上的y坐标
 */
MCropper.prototype.renderImage = function renderImage (imgStartX, imgStartY, imgScale) {
  imgScale = Math.max(imgScale, this.imgOriginScale);
  if(imgScale !== this.imgScale) {
    // 如果要缩放，先计算新的imgStartCoordRange，再修正imgStartCoord保证不越界
    var ref = this;
      var cropBoxWidth = ref.cropBoxWidth;
      var cropBoxHeight = ref.cropBoxHeight;
      var imgWidth = ref.imgWidth;
      var imgHeight = ref.imgHeight;
    this.imgScale = imgScale;
    this.imgMaxOffsetX = imgWidth * imgScale - cropBoxWidth;
    this.imgMaxOffsetY = imgHeight * imgScale - cropBoxHeight;
  }
  this.imgStartX = limitRange(imgStartX, [0, this.imgMaxOffsetX]);
  this.imgStartY = limitRange(imgStartY, [0, this.imgMaxOffsetY]);
  this.ctx.save();
  this.ctx.globalCompositeOperation = 'destination-over';
  this.ctx.drawImage(
    this.img,
    this.imgOriginX - this.imgStartX,
    this.imgOriginY - this.imgStartY,
    this.imgWidth * imgScale,
    this.imgHeight * imgScale
  );
  this.ctx.restore();
};
MCropper.prototype.renderCover = function renderCover () {
  var ctx = this.ctx;
  ctx.save();
  ctx.fillStyle = 'black';
  ctx.globalAlpha = this.options.modalOpacity;
  ctx.fillRect(0, 0, this.containerWidth, this.containerHeight);
  ctx.restore();
};
MCropper.prototype.renderCropBox = function renderCropBox () {
  var ref = this;
    var ctx = ref.ctx;
    var cropBoxWidth = ref.cropBoxWidth;
    var cropBoxHeight = ref.cropBoxHeight;
    var containerWidth = ref.containerWidth;
    var containerHeight = ref.containerHeight;
  var drawCropBox = this.options.circle
    ? function (spread) { return ctx.arc(
      containerWidth / 2,
      containerHeight / 2,
      cropBoxWidth / 2 + spread / 2,
      0,
      Math.PI * 2,
      false
    ); }
    : function (spread) { return ctx.rect(
      containerWidth / 2 - cropBoxWidth / 2 - spread / 2,
      containerHeight / 2 - cropBoxHeight / 2 - spread / 2,
      cropBoxWidth + spread,
      cropBoxHeight + spread
    ); };

  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  drawCropBox(0);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = this.options.borderColor;
  ctx.lineWidth = this.options.borderWidth;
  // 笔触线条在绘制的图形的内部，修正至外面
  drawCropBox(ctx.lineWidth);
  ctx.stroke();
  ctx.restore();
};
MCropper.prototype.zoomImage = function zoomImage (scale, centerXOnImage, centerYOnImage, centerXOnContainer, centerYOnContainer) {
  scale = Math.max(this.imgOriginScale, scale);
  // 以缩放后的centerCoordOnImage和centerCoordOnContainer重合为前提计算的新的imgStartCoord
  var zoom = scale / this.imgScale;
  centerXOnImage *= zoom;
  centerYOnImage *= zoom;
  var imgStartX = this.imgOriginX - (centerXOnContainer - centerXOnImage);
  var imgStartY = this.imgOriginY - (centerYOnContainer - centerYOnImage);
  this.render(imgStartX, imgStartY, scale);
};
MCropper.prototype.addFingerListener = function addFingerListener () {
    var this$1 = this;

  var tempScale = 0;
  var centerXOnContainer = null;
  var centerYOnContainer = null;
  this.alloyFinger = new AlloyFinger(this.canvas, {
    multipointStart: function (e) {
        var assign;

      var ref = e.touches;
        var t1 = ref[0];
        var t2 = ref[1];
      var centerPageX = (t1.pageX + t2.pageX) / 2;
      var centerPageY = (t1.pageY + t2.pageY) / 2;
      (assign = pageCoord2ElementCoord(this$1.container, centerPageX, centerPageY), centerXOnContainer = assign[0], centerYOnContainer = assign[1]);
      tempScale = this$1.imgScale;
    },
    pinch: function (e) {
      // 将在container坐标系上的坐标换算到img
      var centerXOnImage = centerXOnContainer - (this$1.imgOriginX - this$1.imgStartX);
      var centerYOnImage = centerYOnContainer - (this$1.imgOriginY - this$1.imgStartY);
      this$1.zoomImage(tempScale * e.zoom, centerXOnImage, centerYOnImage, centerXOnContainer, centerYOnContainer);
    },
    pressMove: function (e) {
      e.preventDefault();
      this$1.render(this$1.imgStartX - e.deltaX, this$1.imgStartY - e.deltaY, this$1.imgScale);
    }
  });
};
MCropper.prototype.resetSize = function resetSize () {
  this.containerWidth = this.canvas.width = this.container.clientWidth;
  this.containerHeight = this.canvas.height = this.container.clientHeight;
  var ref = this.options;
    var width = ref.width;
    var height = ref.height;
    var aspectRatio = ref.aspectRatio;
    var containRatio = ref.containRatio;
  if(!width && !height) {
    if(aspectRatio > this.containerWidth / this.containerHeight) {
      this.cropBoxWidth = this.containerWidth * containRatio;
      this.cropBoxHeight = this.cropBoxWidth / aspectRatio;
    } else {
      this.cropBoxHeight = this.containerHeight * containRatio;
      this.cropBoxWidth = this.cropBoxHeight * aspectRatio;
    }
  }
  this.imgOriginX = (this.containerWidth - this.cropBoxWidth) / 2;
  this.imgOriginY = (this.containerHeight - this.cropBoxHeight) / 2;
  this.imgOriginScale = Math.max(this.cropBoxWidth / this.imgWidth, this.cropBoxHeight / this.imgHeight);
};
MCropper.prototype.resize = function resize () {
  if(this.options.restore) {
    var ref = this.getImageData();
      var imgStartXNatural = ref[0];
      var imgStartYNatural = ref[1];
    var zoom = this.imgScale / this.imgOriginScale;
    this.resetSize();
    var imgScale = this.imgOriginScale * zoom;
    this.render(
      imgStartXNatural * imgScale,
      imgStartYNatural * imgScale,
      imgScale
    );
  } else {
    this.resetSize();
    this.renderCenter();
  }
};
MCropper.prototype.getImageData = function getImageData () {
  var scale = this.imgScale;
  return [
    this.imgStartX / scale,
    this.imgStartY / scale,
    this.cropBoxWidth / scale,
    this.cropBoxHeight / scale
  ]
};
/**
 * 裁剪，下列可选参数有且只有一个发挥作用，由上往下优先级降低
 * @param {Object|Number} [options=1] 为数字时作用和options.ratio一样
 * @param {Number} [options.width] 给出宽度，自动计算高度
 * @param {Number} [options.height] 给出高度，自动计算宽度
 * @param {Number} [options.naturalRatio] 基于图片原始尺寸的输出倍率
 * @param {Number} [options.ratio] 基于裁剪框尺寸的输出倍率
 * @return {Canvas}
 */
MCropper.prototype.crop = function crop (options) {
  if(!this.ready) {
    throw new Error('can\'t crop before ready')
  }
  options = options || 1;
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  var aspectRatio = this.cropBoxWidth / this.cropBoxHeight;
  var imageData = this.getImageData();
  if(options.width) {
    canvas.width = options.width;
    canvas.height = options.width * aspectRatio;
  } else if(options.height) {
    canvas.height = options.height;
    canvas.width = options.width / aspectRatio;
  } else if(options.naturalRatio) {
    canvas.width = imageData[2] * options.naturalRatio;
    canvas.height = imageData[3] * options.naturalRatio;
  } else {
    var outputRatio = options.outputRatio || Number(options);
    canvas.width = this.cropBoxWidth * outputRatio;
    canvas.height = this.cropBoxHeight * outputRatio;
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
  );
  return canvas
};
/**
 * 注册初始化成功的回调
 * @param {Function(cropper)} callback 初始化成功后会按顺序执行回调（通过实例化时的options.onReady注册的优先级最高），初始化成功后注册的回调会直接执行
 */
MCropper.prototype.onReady = function onReady (callback) {
  if(this.ready === true) {
    callback(this);
  } else {
    this.callbacks.push(callback);
  }
};
/**
 * 回收资源，移除画布
 */
MCropper.prototype.destroy = function destroy () {
  this.callbacks = [];
  this.alloyFinger.destroy();
  window.removeEventListener('resize', this.resizeListener);
  this.container.removeChild(this.canvas);
  this.container.$$mcropper = null;
};

function limitRange(val, ref) {
  var min = ref[0];
  var max = ref[1];

  return val < min ? min : val > max ? max : val
}

/**
 * 把相对于页面定位的坐标转换相对于元素的坐标
 */
function pageCoord2ElementCoord(el, pageX, pageY) {
  var ref = el.getBoundingClientRect();
  var top = ref.top;
  var left = ref.left;
  return [pageX - left, pageY - top]
}

function assign(object) {
  var sources = [], len = arguments.length - 1;
  while ( len-- > 0 ) sources[ len ] = arguments[ len + 1 ];

  sources.forEach(function (source) {
    for (var variable in source) {
      if (source.hasOwnProperty(variable)) {
        object[variable] = source[variable];
      }
    }
  });
  return object
}

export default MCropper;

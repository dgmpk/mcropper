/*!
 * MCropper.js v1.1.0
 * https://dgmpk.github.io/mcropper/
 *
 * Copyright 2018-present dgmpk
 * Released under the MIT license
 *
 * Date: 2018-10-18T15:28:55.051Z
 */

'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var AlloyFinger = _interopDefault(require('alloyfinger'));

var NAMESPACE = '$$mcropper';

var defaults = {
  containRatio: 0.92,
  aspectRatio: 1,
  modalOpacity: 0.6,
  borderColor: 'rgba(51, 153, 255, 0.75)',
  borderWidth: 1,
  borderOrigin: 'out',
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

  this.options = assign({}, MCropper.defaults, options);
  var ref = this.options;
  var width = ref.width;
  var height = ref.height;
  var aspectRatio = ref.aspectRatio;
  if(width || height) {
    if(width) {
      this.cropBoxWidth = width;
    }
    if(height) {
      this.cropBoxHeight = height;
    }
    if(!this.cropBoxHeight) {
      this.cropBoxHeight = this.cropBoxWidth / aspectRatio;
    }
    if(!this.cropBoxWidth) {
      this.cropBoxWidth = this.cropBoxHeight * aspectRatio;
    }
  }

  this.canvas = document.createElement('canvas');
  assign(this.canvas.style, {
    position: 'absolute',
    zIndex: '1',
    top: '0',
    left: '0'
  });
  this.ctx = this.canvas.getContext('2d');
  this.drawCropBox = this.options.circle
    ? function (spread) { return this$1.ctx.arc(
      this$1.container.clientWidth / 2,
      this$1.container.clientHeight / 2,
      this$1.cropBoxWidth / 2 + spread / 2,
      0,
      Math.PI * 2,
      false
    ); }
    : function (spread) { return this$1.ctx.rect(
      this$1.container.clientWidth / 2 - this$1.cropBoxWidth / 2 - spread / 2,
      this$1.container.clientHeight / 2 - this$1.cropBoxHeight / 2 - spread / 2,
      this$1.cropBoxWidth + spread,
      this$1.cropBoxHeight + spread
    ); };

  this.callbacks = [];
  options.onReady && this.callbacks.push(options.onReady);

  this.img = new Image();
  if(src.substring(0, 4).toLowerCase() === 'http') {
    // resolve base64 uri bug in safari:'cross-origin image load denied by cross-origin resource sharing policy.'
    this.img.crossOrigin = 'anonymous';
  }
  this.img.onload = this.init.bind(this);
  this.img.src = src;
};
MCropper.prototype.init = function init () {
    var this$1 = this;

  this.container.appendChild(this.canvas);
  this.initData();
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
MCropper.prototype.initData = function initData () {
  var containerWidth = this.canvas.width = this.container.clientWidth;
  var containerHeight = this.canvas.height = this.container.clientHeight;
  var ref = this.options;
    var width = ref.width;
    var height = ref.height;
    var aspectRatio = ref.aspectRatio;
    var containRatio = ref.containRatio;
  if(!width && !height) {
    if(aspectRatio > containerWidth / containerHeight) {
      this.cropBoxWidth = containerWidth * containRatio;
      this.cropBoxHeight = this.cropBoxWidth / aspectRatio;
    } else {
      this.cropBoxHeight = containerHeight * containRatio;
      this.cropBoxWidth = this.cropBoxHeight * aspectRatio;
    }
  }
  this.imgOriginX = (containerWidth - this.cropBoxWidth) / 2;
  this.imgOriginY = (containerHeight - this.cropBoxHeight) / 2;
  this.imgMinScale = Math.max(
    this.cropBoxWidth / this.img.naturalWidth,
    this.cropBoxHeight / this.img.naturalHeight
  );
};
MCropper.prototype.renderCenter = function renderCenter () {
  var imgScale = this.imgMinScale;
  this.render(
    this.imgOriginX - (this.img.naturalWidth * imgScale - this.cropBoxWidth) / 2,
    this.imgOriginY - (this.img.naturalHeight * imgScale - this.cropBoxHeight) / 2,
    imgScale
  );
};
MCropper.prototype.render = function render (imgX, imgY, imgScale) {
  this.renderCover();
  this.renderImage(imgX, imgY, imgScale);
};
MCropper.prototype.renderCover = function renderCover () {
  var ref = this;
    var ctx = ref.ctx;
    var ref_options = ref.options;
    var modalOpacity = ref_options.modalOpacity;
    var borderColor = ref_options.borderColor;
    var borderWidth = ref_options.borderWidth;
    var borderOrigin = ref_options.borderOrigin;

  // renderShadow
  ctx.save();
  ctx.globalCompositeOperation = 'copy'; // clear old
  ctx.globalAlpha = modalOpacity;
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, this.container.clientWidth, this.container.clientHeight);
  ctx.restore();

  var spread = borderOrigin === 'out'
    ? borderWidth
    : borderOrigin === 'in'
      ? -borderWidth
      : 0;

  // strokeCropBox
  ctx.save();
  ctx.beginPath();
  ctx.globalCompositeOperation = 'destination-out'; // 裁剪阴影的一部分
  this.drawCropBox(spread + borderWidth); // 加大裁剪部分的面积，使边框线不会重叠在阴影上方
  ctx.fill();
  ctx.restore();

  // renderCropBoxBorder
  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderWidth;
  this.drawCropBox(spread);
  ctx.stroke();
  ctx.restore();
};
MCropper.prototype.renderImage = function renderImage (imgX, imgY, imgScale) {
  imgScale = Math.max(imgScale, this.imgMinScale);
  if(imgScale !== this.imgScale) {
    // 如果要缩放，先计算新的imgStartCoordsRange，再修正imgStartCoords保证不越界
    this.imgScale = imgScale;
    this.imgWidth = this.img.naturalWidth * imgScale;
    this.imgHeight = this.img.naturalHeight * imgScale;
    var imgMaxOffsetX = this.imgWidth - this.cropBoxWidth;
    var imgMaxOffsetY = this.imgHeight - this.cropBoxHeight;
    this.imgXRange = [this.imgOriginX - imgMaxOffsetX, this.imgOriginX];
    this.imgYRange = [this.imgOriginY - imgMaxOffsetY, this.imgOriginY];
  }
  this.imgX = limitRange(imgX, this.imgXRange);
  this.imgY = limitRange(imgY, this.imgYRange);

  var ctx = this.ctx;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-over';
  ctx.drawImage(
    this.img,
    this.imgX,
    this.imgY,
    this.imgWidth,
    this.imgHeight
  );
  ctx.restore();
};
MCropper.prototype.zoomImage = function zoomImage (scale, ref, ref$1) {
    var relativeXOfImage = ref[0];
    var relativeYOfImage = ref[1];
    var relativeXOfContainer = ref$1[0];
    var relativeYOfContainer = ref$1[1];

  scale = Math.max(this.imgMinScale, scale);
  // 以缩放后的coordsOfImage和coordsOfContainer重合为前提计算的新的imgStartCoords
  var zoom = scale / this.imgScale;
  relativeXOfImage *= zoom;
  relativeYOfImage *= zoom;
  this.render(relativeXOfContainer - relativeXOfImage, relativeYOfContainer - relativeYOfImage, scale);
};
MCropper.prototype.addFingerListener = function addFingerListener () {
    var this$1 = this;

  var tempScale = 0;
  var tempRelativeCoordsOfImage = [0, 0];
  // 获取两指之间的中点在container中的坐标
  var getRelativeCoordsOfContainerOnCenter = function (e) {
    var ref = e.touches;
      var t1 = ref[0];
      var t2 = ref[1];
    var pageX = (t1.pageX + t2.pageX) / 2;
    var pageY = (t1.pageY + t2.pageY) / 2;
    var ref$1 = this$1.container.getBoundingClientRect();
      var top = ref$1.top;
      var left = ref$1.left;
    return [pageX - left, pageY - top]
  };
  // 将在container坐标系上的坐标换算到img
  var updateTempRelativeCoordsOfImage = function (ref) {
      var relativeXOfContainer = ref[0];
      var relativeYOfContainer = ref[1];

    tempRelativeCoordsOfImage = [
      relativeXOfContainer - this$1.imgX,
      relativeYOfContainer - this$1.imgY
    ];
  };
  this.alloyFinger = new AlloyFinger(this.canvas, {
    multipointStart: function (e) {
      tempScale = this$1.imgScale;
      updateTempRelativeCoordsOfImage(getRelativeCoordsOfContainerOnCenter(e));
    },
    pinch: function (e) {
      var relativeCoordsOfContainer = getRelativeCoordsOfContainerOnCenter(e);
      this$1.zoomImage(tempScale * e.zoom, tempRelativeCoordsOfImage, relativeCoordsOfContainer);
      updateTempRelativeCoordsOfImage(relativeCoordsOfContainer);
    },
    pressMove: function (e) {
      e.preventDefault();
      this$1.render(this$1.imgX + e.deltaX, this$1.imgY + e.deltaY, this$1.imgScale);
    }
  });
};
MCropper.prototype.resize = function resize () {
  if(this.options.restore) {
    var ref = this.getImageData();
      var naturalImgStartX = ref[0];
      var naturalImgStartY = ref[1];
    var zoom = this.imgScale / this.imgMinScale;
    this.initData();
    var imgScale = this.imgMinScale * zoom;
    this.render(
      this.imgOriginX - naturalImgStartX * imgScale,
      this.imgOriginY - naturalImgStartY * imgScale,
      imgScale
    );
  } else {
    this.initData();
    this.renderCenter();
  }
};
MCropper.prototype.getImageData = function getImageData () {
  var scale = this.imgScale;
  return [
    (this.imgOriginX - this.imgX) / scale,
    (this.imgOriginY - this.imgY) / scale,
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

MCropper.defaults = defaults;

module.exports = MCropper;

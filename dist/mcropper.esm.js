/*!
 * MCropper.js v2.0.0
 * https://dgmpk.github.io/mcropper/
 *
 * Copyright 2018-present dgmpk
 * Released under the MIT license
 *
 * Date: 2019-08-02T14:10:21.279Z
 */

import AlloyFinger from 'alloyfinger';

var NAMESPACE = '__MCropper__';

var defaults = {
  aspectRatio: 1,
  containRatio: 0.92,
  modalOpacity: 0.6,
  borderColor: 'rgba(51, 153, 255, 0.75)',
  borderWidth: 1,
  borderOrigin: 'out',
};

var MCropper = function MCropper(container, src, options, callbackfn) {
  var this$1 = this;

  if (container[NAMESPACE]) {
    container[NAMESPACE].destroy();
  }
  container[NAMESPACE] = this;
  this.container = container;

  if (typeof src === 'object') {
    options = src;
    src = null;
  } else if (typeof options === 'function') {
    callbackfn = options;
    options = null;
  }
  this.options = assign({}, MCropper.defaults, options);

  // try to calculate fixed size of crop box if width or height has provided
  var ref = this.options;
  var width = ref.width;
  var height = ref.height;
  var aspectRatio = ref.aspectRatio;
  if (width || height) {
    if (width) {
      this.cropBoxWidth = width;
    }
    if (height) {
      this.cropBoxHeight = height;
    }
    if (!this.cropBoxHeight) {
      this.cropBoxHeight = this.cropBoxWidth / aspectRatio;
    }
    if (!this.cropBoxWidth) {
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
  this.container.appendChild(this.canvas);

  this.img = new Image();
  src && this.setSrc(src, callbackfn);
};
MCropper.prototype.setSrc = function setSrc (src, callbackfn) {
  this.alloyFingerListener && this.alloyFingerListener.destroy();
  this.ready = false;
  this.src = src;
  this.callbackfns = [];
  callbackfn && this.callbackfns.push(callbackfn);
  if (src.substring(0, 4).toLowerCase() === 'http') {
    // resolve base64 uri bug in safari:'cross-origin image load denied by cross-origin resource sharing policy.'
    this.img.crossOrigin = 'anonymous';
  }
  this.img.onload = this.init.bind(this);
  this.img.src = src;
};
MCropper.prototype.init = function init () {
  this.ready = true;
  this.calculateImgData();
  this.renderCenter();
  var callback;
  while ((callback = this.callbackfns.shift())) {
    callback(this);
  }
  this.addFingerListener();
};
MCropper.prototype.calculateImgData = function calculateImgData () {
  var containerWidth = this.canvas.width = this.container.clientWidth;
  var containerHeight = this.canvas.height = this.container.clientHeight;
  var ref = this.options;
    var width = ref.width;
    var height = ref.height;
    var aspectRatio = ref.aspectRatio;
    var containRatio = ref.containRatio;
  if (!width && !height) {
    if (aspectRatio > containerWidth / containerHeight) {
      this.cropBoxWidth = containerWidth * containRatio;
      this.cropBoxHeight = this.cropBoxWidth / aspectRatio;
    } else {
      this.cropBoxHeight = containerHeight * containRatio;
      this.cropBoxWidth = this.cropBoxHeight * aspectRatio;
    }
  }
  this.cropBoxOriginX = (containerWidth - this.cropBoxWidth) / 2;
  this.cropBoxOriginY = (containerHeight - this.cropBoxHeight) / 2;
  this.imgMinScale = Math.max(
    this.cropBoxWidth / this.img.naturalWidth,
    this.cropBoxHeight / this.img.naturalHeight
  );
};
MCropper.prototype.renderCenter = function renderCenter () {
  var imgScale = this.imgMinScale;
  this.render(
    this.cropBoxOriginX - (this.img.naturalWidth * imgScale - this.cropBoxWidth) / 2,
    this.cropBoxOriginY - (this.img.naturalHeight * imgScale - this.cropBoxHeight) / 2,
    imgScale
  );
};
MCropper.prototype.render = function render (imgOriginX, imgOriginY, imgScale) {
  this.renderCover();
  this.renderImage(imgOriginX, imgOriginY, imgScale);
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
MCropper.prototype.renderImage = function renderImage (imgOriginX, imgOriginY, imgScale) {
  imgScale = Math.max(imgScale, this.imgMinScale);

  // 根据缩放计算一个img起点坐标范围来限制img起点坐标的取值范围，以保证图片始终比裁剪框大
  if (imgScale !== this.imgScale) {
    this.imgScale = imgScale;
    this.imgWidth = this.img.naturalWidth * imgScale;
    this.imgHeight = this.img.naturalHeight * imgScale;
    var imgMaxOffsetX = this.imgWidth - this.cropBoxWidth;
    var imgMaxOffsetY = this.imgHeight - this.cropBoxHeight;
    this.imgOriginXRange = [this.cropBoxOriginX - imgMaxOffsetX, this.cropBoxOriginX];
    this.imgOriginYRange = [this.cropBoxOriginY - imgMaxOffsetY, this.cropBoxOriginY];
  }
  this.imgOriginX = limitRange(imgOriginX, this.imgOriginXRange);
  this.imgOriginY = limitRange(imgOriginY, this.imgOriginYRange);

  var ctx = this.ctx;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-over';
  ctx.drawImage(
    this.img,
    this.imgOriginX,
    this.imgOriginY,
    this.imgWidth,
    this.imgHeight
  );
  ctx.restore();
};

/**
 * 缩放（始终以多指触点的中点缩放，所以可能会同时带有平移）
 * @param {number} scale
 * @param {[number, number]} param1 缩放前的中点在image坐标系的坐标
 * @param {[number, number]} param2 缩放后的中点在container坐标系的坐标
 */
MCropper.prototype.zoomImage = function zoomImage (scale, ref, ref$1) {
    var ix = ref[0];
    var iy = ref[1];
    var cx = ref$1[0];
    var cy = ref$1[1];

  scale = Math.max(this.imgMinScale, scale);
  var zoom = scale / this.imgScale;
  this.render(cx - ix * zoom, cy - iy * zoom, scale);
};
MCropper.prototype.pagePointToContainerPoint = function pagePointToContainerPoint (ref) {
    var pageX = ref[0];
    var pageY = ref[1];

  var ref$1 = this.container.getBoundingClientRect();
    var top = ref$1.top;
    var left = ref$1.left;
  return [pageX - left, pageY - top]
};
MCropper.prototype.containerPointToImagePoint = function containerPointToImagePoint (ref) {
    var cx = ref[0];
    var cy = ref[1];

  return [cx - this.imgOriginX, cy - this.imgOriginY]
};
MCropper.prototype.addFingerListener = function addFingerListener () {
    var this$1 = this;

  var initialImgScale;
  var centerOfGravityOnImage;
  var getCenterOfGravityOnContainer = function (event) {
    var points = [].slice.apply(event.touches).map(function (touch) { return [touch.pageX, touch.pageY]; });
    var centerOfGravity;
    if (points.length === 1) {
      centerOfGravity = points[0];
    } else if (points.length === 2) {
      centerOfGravity = [(points[0][0] + points[1][0]) / 2, (points[0][1] + points[1][1]) / 2];
    } else {
      centerOfGravity = getCenterOfGravity(points);
    }
    return this$1.pagePointToContainerPoint(centerOfGravity)
  };
  var updateCenterOfGravityOnImage = function (containerPoint) {
    centerOfGravityOnImage = this$1.containerPointToImagePoint(containerPoint);
  };
  this.alloyFingerListener = new AlloyFinger(this.canvas, {
    multipointStart: function (e) {
      initialImgScale = this$1.imgScale;
      updateCenterOfGravityOnImage(getCenterOfGravityOnContainer(e));
    },
    pinch: function (e) {
      var newCenterOfGravityOnContainer = getCenterOfGravityOnContainer(e);
      this$1.zoomImage(initialImgScale * e.zoom, centerOfGravityOnImage, newCenterOfGravityOnContainer);
      updateCenterOfGravityOnImage(newCenterOfGravityOnContainer);
    },
    pressMove: function (e) {
      e.preventDefault();
      this$1.render(this$1.imgOriginX + e.deltaX, this$1.imgOriginY + e.deltaY, this$1.imgScale);
    }
  });
};
MCropper.prototype.resize = function resize (reset) {
  if (reset) {
    this.calculateImgData();
    this.renderCenter();
  } else {
    var ref = this.getImageData();
      var sx = ref[0];
      var sy = ref[1];
    var zoom = this.imgScale / this.imgMinScale;
    this.calculateImgData();
    var imgScale = this.imgMinScale * zoom;
    this.render(
      this.cropBoxOriginX - sx * imgScale,
      this.cropBoxOriginY - sy * imgScale,
      imgScale
    );
  }
};
MCropper.prototype.getImageData = function getImageData () {
  var scale = this.imgScale;
  return [
    (this.cropBoxOriginX - this.imgOriginX) / scale, // 被剪切图像的裁剪起点的 x 坐标
    (this.cropBoxOriginY - this.imgOriginY) / scale, // 被剪切图像的裁剪起点的 y 坐标
    this.cropBoxWidth / scale, // 被剪切图像的宽度
    this.cropBoxHeight / scale // 被剪切图像的高度
  ]
};
MCropper.prototype.crop = function crop (value, attribute) {
    if ( value === void 0 ) value = 1;
    if ( attribute === void 0 ) attribute = 'ratio';

  if (!this.ready) {
    throw new Error('can\'t crop before ready')
  }
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  var aspectRatio = this.cropBoxWidth / this.cropBoxHeight;
  var imageData = this.getImageData();
  switch (attribute) {
    case 'width':
      canvas.width = value;
      canvas.height = value * aspectRatio;
      break;
    case 'height':
      canvas.height = value;
      canvas.width = value / aspectRatio;
      break;
    case 'naturalRatio':
      canvas.width = imageData[2] * value;
      canvas.height = imageData[3] * value;
      break;
    default:
      canvas.width = this.cropBoxWidth * value;
      canvas.height = this.cropBoxHeight * value;
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
MCropper.prototype.onReady = function onReady (callback) {
  if (this.ready === true) {
    callback(this);
  } else {
    this.callbackfns.push(callback);
  }
};
MCropper.prototype.destroy = function destroy () {
  this.img.src = this.img.onload = null;
  this.alloyFingerListener && this.alloyFingerListener.destroy();
  this.container.removeChild(this.canvas);
  delete this.container[NAMESPACE];
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

function getCenterOfGravity(points) {
  var len = points.length;
  var area = 0;
  var x = 0;
  var y = 0;

  for (var index = 1; index <= len; index++) {
    var ref = points[index % len];
    var nx = ref[0];
    var ny = ref[1];
    var ref$1 = points[index - 1];
    var lx = ref$1[0];
    var ly = ref$1[1];
    var temp = (nx * ly - ny * lx) / 2;
    area += temp;
    x += temp * (nx + lx) / 3;
    y += temp * (ny + ly) / 3;
  }
  x = x / area;
  y = y / area;
  return [x, y]
}

MCropper.defaults = defaults;

export default MCropper;

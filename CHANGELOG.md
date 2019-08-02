# 1.1.0 (2018-10-18)

## Code Refactoring

## Features

* 缩放图片时不再锁定图片的位置，双指中点对应图片的位置会跟随双指中点移动
* 新增可选参数borderOrigin控制裁剪框边框绘制位置
* 现在允许通过修改MCropper.defaults来控制默认值

# 1.1.1 (2019-01-26)

## Bug Fixes

* 修复不传options报错的Bug

# 2.0.0 (2019-08-02)

## Code Refactoring

## Features

* 添加TypeScript支持
* 调整类实例化参数：src变为可选；移除options.onReady并调整为末尾的可选参数；移除options.responsive和options.restore以及各自对应的功能
* 新增实例方法setSrc：实例化可以修改src
* 调整实例方法crop：参数优化
* 调整实例方法resize：新增reset参数，代替类实例化参数options.restore，起相反作用

/**
 * Notes: 活动海报生成页（模版选择 + 实时预览 + 保存到相册）
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 */

const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');
const qrLib = require('../../../../../lib/tools/qrcode_lib.js');

// 海报画布设计尺寸（逻辑像素，导出时按 dpr 放大保证清晰度）
const DESIGN_W = 480;
const DESIGN_H = 780;

// 读书会slogan
const SLOGAN = '以书会友 · 共读美好时光';

// 海报模版配置（不同配色与版式）
const TEMPLATES = [
	{ name: '明亮黄', layout: 'card', bg: '#FFC700', card: '#FFFFFF', titleColor: '#333333', textColor: '#777777', accent: '#FFC700', subColor: '#AAAAAA', decor: '#FFD84D' },
	{ name: '墨绿', layout: 'center', bg: '#1F4E3D', card: '#FFFBF0', titleColor: '#1F4E3D', textColor: '#5A6B62', accent: '#C9A063', subColor: '#93A39A', decor: '#2A6349' },
	{ name: '藏青', layout: 'band', bg: '#22314E', card: '#FFFFFF', titleColor: '#22314E', textColor: '#5B6478', accent: '#22314E', subColor: '#9AA2B5', decor: '#2E4266' },
];

Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,
		templates: TEMPLATES, // 模版列表
		curTemplate: 0, // 当前选中模版下标
		isDraw: false, // 海报是否绘制完成（未完成前禁止保存）
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: async function (options) {
		ProjectBiz.initPage(this);
		if (!pageHelper.getOptions(this, options)) return;
		this._loadDetail();
	},

	/**
	 * 加载活动详情数据（复用活动详情接口）
	 */
	_loadDetail: async function () {
		let id = this.data.id;
		if (!id) return;

		let params = {
			id,
		};
		let opt = {
			title: 'bar'
		};
		let activity = await cloudHelper.callCloudData('activity/view', params, opt);
		if (!activity) {
			this.setData({
				isLoad: null
			});
			return;
		}

		this.setData({
			isLoad: true,
			activity,
		});

		this._tryDraw();
	},

	/**
	 * 生命周期函数--监听页面初次渲染完成
	 */
	onReady: function () {
		this._initCanvas();
	},

	/**
	 * 初始化 canvas 2d 画布
	 */
	_initCanvas: function () {
		wx.createSelectorQuery().select('#posterCanvas')
			.fields({ node: true, size: true })
			.exec((res) => {
				if (!res || !res[0] || !res[0].node) return;
				let canvas = res[0].node;
				let ctx = canvas.getContext('2d');
				// 按设备像素比放大画布，保证导出图片清晰
				let dpr = 2;
				try {
					dpr = wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio;
				} catch (e) { }
				canvas.width = DESIGN_W * dpr;
				canvas.height = DESIGN_H * dpr;
				ctx.scale(dpr, dpr);

				this._canvas = canvas;
				this._ctx = ctx;
				this._canvasReady = true;

				this._tryDraw();
			});
	},

	/**
	 * 画布与数据都就绪后开始准备素材并绘制
	 */
	_tryDraw: async function () {
		if (!this._canvasReady || !this.data.isLoad || this._preparing || this._prepared) return;
		this._preparing = true;
		await this._prepareResource();
		this._preparing = false;
		this._prepared = true;
		this._drawPoster();
	},

	/**
	 * 准备海报素材：封面图、小程序码
	 */
	_prepareResource: async function () {
		let activity = this.data.activity;

		// 封面图：云文件 fileID 需先转成临时链接，再下载为本地临时文件绘制
		let cover = (activity.ACTIVITY_OBJ && activity.ACTIVITY_OBJ.cover) ? activity.ACTIVITY_OBJ.cover[0] : '';
		if (cover && cover.startsWith('cloud'))
			cover = await cloudHelper.getTempFileURLOne(cover);
		cover = await this._getLocalImage(cover);
		this._coverImg = cover ? await this._loadCanvasImage(cover) : null;

		// 小程序码：优先使用活动自带的小程序码（ACTIVITY_QR）
		let qr = activity.ACTIVITY_QR || '';
		if (qr && qr.startsWith('cloud'))
			qr = await cloudHelper.getTempFileURLOne(qr);
		qr = await this._getLocalImage(qr);
		if (qr) {
			this._qrImg = await this._loadCanvasImage(qr);
		} else {
			// 无小程序码时，用二维码库生成带活动id参数的二维码占位
			let text = 'projects/activitybook/pages/activity/detail/activity_detail?id=' + activity._id;
			let dataUrl = qrLib.drawImg(text, { size: 280, errorCorrectLevel: 'M' });
			this._qrImg = await this._loadCanvasImage(dataUrl);
		}
	},

	/**
	 * 将网络图片下载为本地临时路径（canvas 绘制需要）
	 */
	_getLocalImage: function (src) {
		return new Promise((resolve) => {
			if (!src) return resolve('');
			if (src.startsWith('data:image')) return resolve(src); // base64 直接使用
			wx.getImageInfo({
				src,
				success: (res) => resolve(res.path),
				fail: () => resolve('')
			});
		});
	},

	/**
	 * 加载图片到 canvas 画布图片对象
	 */
	_loadCanvasImage: function (src) {
		return new Promise((resolve) => {
			let img = this._canvas.createImage();
			img.onload = () => resolve(img);
			img.onerror = () => resolve(null);
			img.src = src;
		});
	},

	//################## 以下为 canvas 绘制相关方法 ##################

	/**
	 * 圆角矩形路径
	 */
	_roundRect: function (ctx, x, y, w, h, r) {
		ctx.beginPath();
		ctx.moveTo(x + r, y);
		ctx.arcTo(x + w, y, x + w, y + h, r);
		ctx.arcTo(x + w, y + h, x, y + h, r);
		ctx.arcTo(x, y + h, x, y, r);
		ctx.arcTo(x, y, x + w, y, r);
		ctx.closePath();
	},

	/**
	 * 文本自动换行（超出最大行数时末行加省略号）
	 */
	_wrapText: function (ctx, text, maxWidth, maxLines = 2) {
		text = String(text || '');
		let lines = [];
		let line = '';
		for (let k = 0; k < text.length; k++) {
			let ch = text[k];
			if (line && ctx.measureText(line + ch).width > maxWidth) {
				lines.push(line);
				line = ch;
				if (lines.length >= maxLines) break;
			} else {
				line += ch;
			}
		}
		if (line && lines.length < maxLines) lines.push(line);
		// 超出最大行数，末行补省略号
		if (lines.length >= maxLines) {
			let last = lines[maxLines - 1];
			while (last && ctx.measureText(last + '…').width > maxWidth)
				last = last.slice(0, -1);
			lines[maxLines - 1] = last + '…';
		}
		return lines;
	},

	/**
	 * 绘制封面图（按比例裁剪铺满，类似 image 组件 aspectFill）
	 */
	_drawCover: function (ctx, x, y, w, h, r, tpl) {
		ctx.save();
		this._roundRect(ctx, x, y, w, h, r);
		ctx.clip();
		if (this._coverImg) {
			let img = this._coverImg;
			let scale = Math.max(w / img.width, h / img.height);
			let sw = w / scale;
			let sh = h / scale;
			let sx = (img.width - sw) / 2;
			let sy = (img.height - sh) / 2;
			ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
		} else {
			// 封面缺失时的占位绘制
			ctx.fillStyle = tpl.accent;
			ctx.fillRect(x, y, w, h);
			ctx.fillStyle = '#FFFFFF';
			ctx.font = 'bold 24px sans-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText('读书会', x + w / 2, y + h / 2);
		}
		ctx.restore();
	},

	/**
	 * 绘制二维码区块（白色底衬 + 二维码）
	 */
	_drawQrBlock: function (ctx, x, y, size, tpl) {
		ctx.save();
		ctx.fillStyle = '#FFFFFF';
		this._roundRect(ctx, x, y, size, size, 10);
		ctx.fill();
		ctx.strokeStyle = tpl.accent;
		ctx.lineWidth = 2;
		ctx.stroke();
		if (this._qrImg)
			ctx.drawImage(this._qrImg, x + 10, y + 10, size - 20, size - 20);
		ctx.restore();
	},

	/**
	 * 绘制虚线分隔线
	 */
	_drawDashLine: function (ctx, x1, y, x2, color) {
		ctx.save();
		ctx.strokeStyle = color;
		ctx.lineWidth = 1;
		ctx.setLineDash([6, 6]);
		ctx.beginPath();
		ctx.moveTo(x1, y);
		ctx.lineTo(x2, y);
		ctx.stroke();
		ctx.restore();
	},

	/**
	 * 组装海报信息文本
	 */
	_getInfoLines: function (activity) {
		let cntText;
		if (activity.ACTIVITY_MAX_CNT == 0)
			cntText = '名额：不限人数（已报名' + (activity.ACTIVITY_JOIN_CNT || 0) + '人）';
		else
			cntText = '名额：已报名 ' + (activity.ACTIVITY_JOIN_CNT || 0) + ' / ' + activity.ACTIVITY_MAX_CNT + ' 人';

		return [
			'时间：' + (activity.time || ''),
			'地点：' + (activity.ACTIVITY_ADDRESS || '待定'),
			cntText
		];
	},

	/**
	 * 绘制海报主入口：按当前模版重绘画布
	 */
	_drawPoster: function () {
		if (!this._canvasReady || !this._prepared) return;
		let ctx = this._ctx;
		let tpl = TEMPLATES[this.data.curTemplate];
		let activity = this.data.activity;

		// 清空画布后按模版版式重绘
		ctx.clearRect(0, 0, DESIGN_W, DESIGN_H);
		switch (tpl.layout) {
			case 'center':
				this._drawTplCenter(ctx, tpl, activity);
				break;
			case 'band':
				this._drawTplBand(ctx, tpl, activity);
				break;
			default:
				this._drawTplCard(ctx, tpl, activity);
				break;
		}

		this.setData({
			isDraw: true // 绘制完成，允许保存
		});
	},

	/**
	 * 模版一：明亮黄（卡片版式）
	 */
	_drawTplCard: function (ctx, tpl, activity) {
		// 背景与装饰圆
		ctx.fillStyle = tpl.bg;
		ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);
		ctx.fillStyle = tpl.decor;
		ctx.beginPath();
		ctx.arc(440, 80, 70, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(30, 730, 90, 0, Math.PI * 2);
		ctx.fill();

		// 白色卡片（带阴影）
		ctx.save();
		ctx.shadowColor = 'rgba(0,0,0,0.15)';
		ctx.shadowBlur = 16;
		ctx.shadowOffsetY = 6;
		ctx.fillStyle = tpl.card;
		this._roundRect(ctx, 30, 30, 420, 720, 24);
		ctx.fill();
		ctx.restore();

		// 品牌标签
		ctx.fillStyle = tpl.accent;
		this._roundRect(ctx, 50, 54, 96, 36, 18);
		ctx.fill();
		ctx.fillStyle = '#FFFFFF';
		ctx.font = 'bold 20px sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('读书会', 98, 73);

		// 封面图
		this._drawCover(ctx, 50, 106, 380, 216, 16, tpl);

		// 活动标题（最多两行）
		ctx.textAlign = 'left';
		ctx.textBaseline = 'top';
		ctx.fillStyle = tpl.titleColor;
		ctx.font = 'bold 30px sans-serif';
		let titleLines = this._wrapText(ctx, activity.ACTIVITY_TITLE, 380, 2);
		for (let k = 0; k < titleLines.length; k++)
			ctx.fillText(titleLines[k], 50, 342 + k * 42);

		// 活动信息（时间/地点/名额）
		let infoLines = this._getInfoLines(activity);
		ctx.font = '20px sans-serif';
		ctx.fillStyle = tpl.textColor;
		for (let k = 0; k < infoLines.length; k++) {
			let line = this._wrapText(ctx, infoLines[k], 380, 1)[0] || '';
			ctx.fillText(line, 50, 444 + k * 34);
		}

		// 虚线分隔
		this._drawDashLine(ctx, 50, 556, 430, '#E5E5E5');

		// slogan 与引导文案
		ctx.fillStyle = tpl.accent;
		ctx.font = 'bold 20px sans-serif';
		ctx.fillText(SLOGAN, 50, 592);
		ctx.fillStyle = tpl.subColor;
		ctx.font = '15px sans-serif';
		ctx.fillText('长按识别小程序码', 50, 636);
		ctx.fillText('查看活动详情 · 立即报名', 50, 662);

		// 小程序码
		this._drawQrBlock(ctx, 326, 570, 104, tpl);
	},

	/**
	 * 模版二：墨绿（居中版式）
	 */
	_drawTplCenter: function (ctx, tpl, activity) {
		// 背景与描边相框
		ctx.fillStyle = tpl.bg;
		ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);
		ctx.strokeStyle = tpl.accent;
		ctx.lineWidth = 2;
		ctx.strokeRect(14, 14, DESIGN_W - 28, DESIGN_H - 28);

		// 米色卡片
		ctx.fillStyle = tpl.card;
		this._roundRect(ctx, 40, 40, 400, 700, 20);
		ctx.fill();

		// 品牌名（居中，两侧装饰线）
		ctx.strokeStyle = tpl.accent;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(100, 78);
		ctx.lineTo(180, 78);
		ctx.moveTo(300, 78);
		ctx.lineTo(380, 78);
		ctx.stroke();
		ctx.fillStyle = tpl.accent;
		ctx.font = 'bold 22px sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('读 书 会', 240, 78);

		// 封面图（居中）
		this._drawCover(ctx, 70, 118, 340, 190, 12, tpl);

		// 活动标题（居中，最多两行）
		ctx.textBaseline = 'top';
		ctx.fillStyle = tpl.titleColor;
		ctx.font = 'bold 28px sans-serif';
		let titleLines = this._wrapText(ctx, activity.ACTIVITY_TITLE, 340, 2);
		for (let k = 0; k < titleLines.length; k++)
			ctx.fillText(titleLines[k], 240, 336 + k * 40);

		// 活动信息（居中）
		let infoLines = this._getInfoLines(activity);
		ctx.font = '18px sans-serif';
		ctx.fillStyle = tpl.textColor;
		for (let k = 0; k < infoLines.length; k++) {
			let line = this._wrapText(ctx, infoLines[k], 340, 1)[0] || '';
			ctx.fillText(line, 240, 436 + k * 32);
		}

		// slogan
		ctx.fillStyle = tpl.accent;
		ctx.font = '18px sans-serif';
		ctx.fillText(SLOGAN, 240, 550);

		// 小程序码（居中）
		this._drawQrBlock(ctx, 188, 588, 104, tpl);
		ctx.fillStyle = tpl.subColor;
		ctx.font = '13px sans-serif';
		ctx.fillText('长按识别小程序码 · 查看活动详情', 240, 710);
	},

	/**
	 * 模版三：藏青（顶部品牌带版式）
	 */
	_drawTplBand: function (ctx, tpl, activity) {
		// 背景与顶部装饰
		ctx.fillStyle = tpl.bg;
		ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);
		ctx.fillStyle = tpl.decor;
		ctx.beginPath();
		ctx.arc(410, 30, 90, 0, Math.PI * 2);
		ctx.fill();

		// 顶部品牌带文案
		ctx.textAlign = 'left';
		ctx.textBaseline = 'top';
		ctx.fillStyle = '#FFFFFF';
		ctx.font = 'bold 34px sans-serif';
		ctx.fillText('读书会', 48, 48);
		ctx.fillStyle = 'rgba(255,255,255,0.85)';
		ctx.font = '18px sans-serif';
		ctx.fillText(SLOGAN, 48, 100);

		// 白色内容卡片（与品牌带交叠）
		ctx.save();
		ctx.shadowColor = 'rgba(0,0,0,0.25)';
		ctx.shadowBlur = 16;
		ctx.shadowOffsetY = 6;
		ctx.fillStyle = tpl.card;
		this._roundRect(ctx, 30, 150, 420, 600, 24);
		ctx.fill();
		ctx.restore();

		// 封面图
		this._drawCover(ctx, 50, 170, 380, 200, 16, tpl);

		// 活动标题（最多两行）
		ctx.fillStyle = tpl.titleColor;
		ctx.font = 'bold 28px sans-serif';
		let titleLines = this._wrapText(ctx, activity.ACTIVITY_TITLE, 380, 2);
		for (let k = 0; k < titleLines.length; k++)
			ctx.fillText(titleLines[k], 50, 390 + k * 40);

		// 活动信息（带色块前缀）
		let infoLines = this._getInfoLines(activity);
		ctx.font = '18px sans-serif';
		for (let k = 0; k < infoLines.length; k++) {
			let y = 486 + k * 34;
			ctx.fillStyle = tpl.accent;
			ctx.fillRect(50, y + 5, 10, 10);
			ctx.fillStyle = tpl.textColor;
			let line = this._wrapText(ctx, infoLines[k], 360, 1)[0] || '';
			ctx.fillText(line, 68, y);
		}

		// 虚线分隔
		this._drawDashLine(ctx, 50, 600, 430, '#E5E5E5');

		// 引导文案
		ctx.fillStyle = tpl.accent;
		ctx.font = 'bold 20px sans-serif';
		ctx.fillText('扫码报名参加活动', 50, 634);
		ctx.fillStyle = tpl.subColor;
		ctx.font = '15px sans-serif';
		ctx.fillText('长按识别小程序码', 50, 670);

		// 小程序码
		this._drawQrBlock(ctx, 326, 606, 104, tpl);
	},

	//################## 以下为交互事件 ##################

	/**
	 * 切换海报模版（即时重绘预览）
	 */
	bindTemplateTap: function (e) {
		let idx = Number(pageHelper.dataset(e, 'idx'));
		if (idx == this.data.curTemplate) return;
		this.setData({
			curTemplate: idx,
			isDraw: false // 重绘期间禁止保存
		}, () => {
			this._drawPoster();
		});
	},

	/**
	 * 保存海报到相册
	 */
	bindSaveTap: function () {
		if (!this.data.isDraw) {
			pageHelper.showNoneToast('海报生成中，请稍候');
			return;
		}
		if (this._saving) return;
		this._saving = true;

		// canvas 导出图片
		wx.canvasToTempFilePath({
			canvas: this._canvas,
			success: (res) => {
				wx.saveImageToPhotosAlbum({
					filePath: res.tempFilePath,
					success: () => {
						this._saving = false;
						pageHelper.showSuccToast('已保存到相册');
					},
					fail: (err) => {
						this._saving = false;
						this._handleSaveFail(err);
					}
				});
			},
			fail: (err) => {
				this._saving = false;
				console.error(err);
				pageHelper.showNoneToast('海报导出失败，请重试');
			}
		});
	},

	/**
	 * 处理保存相册失败（含授权拒绝的引导）
	 */
	_handleSaveFail: function (err) {
		let msg = (err && err.errMsg) || '';
		if (msg.indexOf('auth') > -1 || msg.indexOf('deny') > -1) {
			// 用户拒绝过相册授权，引导到设置页开启
			wx.showModal({
				title: '温馨提示',
				content: '保存海报需要您授权「保存到相册」权限',
				confirmText: '去授权',
				cancelText: '取消',
				success: (res) => {
					if (res.confirm) {
						wx.openSetting({
							success: (setRes) => {
								// 授权成功后自动重新保存
								if (setRes.authSetting && setRes.authSetting['scope.writePhotosAlbum'])
									this.bindSaveTap();
							}
						});
					}
				}
			});
		} else {
			pageHelper.showNoneToast('保存失败，请重试');
		}
	},

	/**
	 * 用户点击右上角分享
	 */
	onShareAppMessage: function () {
		if (!this.data.activity) return {};
		return {
			title: this.data.activity.ACTIVITY_TITLE,
			path: 'projects/activitybook/pages/activity/detail/activity_detail?id=' + this.data.activity._id
		};
	},

	url: function (e) {
		pageHelper.url(e, this);
	},
})

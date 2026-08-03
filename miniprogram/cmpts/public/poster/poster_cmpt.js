/*
https://github.com/jasondu/wxa-plugin-canvas
### 标准尺寸：
width: 375, // rpx
height: 670,

### 父页面分享按钮取值
onShareAppMessage: function (e) {
	let img = e.target.dataset.img;
	return {
		title: 'xxx',
		imageUrl: img,
		path: 'xxxx',
	}
}
*/
import Poster from '../../../cmpts/public/poster/wxa-plugin-canvas/poster/poster.js'
const pageHelper = require('../../../helper/page_helper.js');
const picHelper = require('../../../helper/pic_helper.js');
const helper = require('../../../helper/helper.js');

Component({
	externalClasses: ['poster-class'],

	options: {
		addGlobalClass: true,
		multipleSlots: true
	},

	/**
	 * 组件的属性列表
	 */
	properties: {
		config: { // 图形参数
			type: Object,
			value: null,
		},
		isQr: { // 是否叠加小程序码
			type: Boolean,
			value: false
		},
		isFace: { // 是否叠加头像
			type: Boolean,
			value: false
		},
		doPoster: {
			type: Boolean,
			value: true
		},
		show: { // 显示
			type: Boolean,
			value: false
		},
		img: { //图片文件
			type: String,
			value: ''
		},
		templateIndex: { // 海报模板编号 0=简约蓝 1=活力橙 2=清新绿
			type: Number,
			value: 0
		}
	},

	/**
	 * 组件的初始数据
	 */
	data: {
		isLoad: false,
		// 模板配置：背景色、主文字色、次文字色、面板色
		templateList: [
			{
				index: 0,
				name: '简约蓝',
				bg: '#345678',
				titleColor: '#222222',
				subColor: '#888888',
				panelColor: '#ffffff',
				preview: 'linear-gradient(135deg, #345678 0%, #223a52 100%)'
			},
			{
				index: 1,
				name: '活力橙',
				bg: '#ff7a45',
				titleColor: '#ffffff',
				subColor: 'rgba(255,255,255,0.85)',
				panelColor: 'rgba(255,120,80,0.18)',
				preview: 'linear-gradient(135deg, #ff9966 0%, #ff5e62 100%)'
			},
			{
				index: 2,
				name: '清新绿',
				bg: '#38c9a8',
				titleColor: '#0f3d35',
				subColor: 'rgba(15,61,53,0.7)',
				panelColor: 'rgba(255,255,255,0.55)',
				preview: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
			}
		]
	},

	lifetimes: {
		attached: function () {

		},
		ready: function () {
			this._init();
		},
		detached: function () {
			// 在组件实例被从页面节点树移除时执行
		},
	},

	/**
	 * 组件的方法列表 
	 */
	methods: {
		/**
		 * 初始化：校验父页面传入的 config 是否合法，
		 * 避免因未正确传参导致生成海报时静默失败、难以排查。
		 */
		_init: async function () {
			let config = this.data.config;

			// config 允许在父页面 onReady 之后异步传入，这里只做"已传入但不合法"的告警
			if (config === null || config === undefined) return;

			if (typeof config !== 'object') {
				console.error('[poster_cmpt] config 必须是对象，当前类型：' + typeof config);
				return;
			}

			// 海报至少要有一项内容（文字/图片/方块/线条），否则生成的是空白海报
			let hasContent = (Array.isArray(config.texts) && config.texts.length > 0)
				|| (Array.isArray(config.images) && config.images.length > 0)
				|| (Array.isArray(config.blocks) && config.blocks.length > 0)
				|| (Array.isArray(config.lines) && config.lines.length > 0);

			if (!hasContent) {
				console.warn('[poster_cmpt] config 缺少 texts/images/blocks/lines 内容，海报可能为空白。请检查父页面是否正确传入海报配置。');
			}
		},

		bindPosterTap: function (e) {
			this.setData({
				isCreate:true,
				isLoad: false,
			}, async () => {
				await this.createPoster();
			});
		},
		bindCloseTap: function () {
			this.setData({
				show: false
			});
		},

		/**
		 * 异步生成海报
		 */
		createPoster: async function () {
			// TODO:根据屏幕大小来生成，但是没有负定位

			let posterConfig = {
				width: 480, // rpx
				height: 650,
				pixelRatio: 2, // 2 为原始大小
				backgroundColor: '#345678',
				debug: false,
			}

			let config = this.data.config;
			if (!config) {
				// 父页面未正确传参，给出明确提示而不是静默失败
				console.error('[poster_cmpt] 生成海报失败：config 为空，请检查父页面是否传入了海报配置');
				wx.showToast({
					title: '海报配置缺失',
					icon: 'none',
					duration: 2000
				});
				return;
			}

			// 深拷贝父页面传入的config，避免反复修改原对象
			config = JSON.parse(JSON.stringify(config));

			if (!helper.isDefined(config['width']))
				config.width = posterConfig.width;

			if (!helper.isDefined(config['height']))
				config.height = posterConfig.height;

			if (!helper.isDefined(config['pixelRatio']))
				config.pixelRatio = posterConfig.pixelRatio;

			if (!helper.isDefined(config['debug']))
				config.debug = posterConfig.debug;

			// 根据模板覆盖背景色及文字颜色
			let tplIdx = this.data.templateIndex || 0;
			let tpl = this.data.templateList[tplIdx] || this.data.templateList[0];
			config.backgroundColor = tpl.bg;

			// 覆盖内部白色面板颜色（blocks[0]）
			if (config.blocks && config.blocks.length) {
				config.blocks[0].backgroundColor = tpl.panelColor;
			}

			// 覆盖文字颜色：主标题用titleColor，其余描述/提示用subColor
			if (config.texts && config.texts.length) {
				for (let i = 0; i < config.texts.length; i++) {
					let t = config.texts[i];
					if (i === 0) {
						t.color = tpl.titleColor;
					} else {
						t.color = tpl.subColor;
					}
				}
			}

			//Object.assign(posterConfig, this.data.config); // TODO有问题

			this.setData({
				posterConfig: config
			}, async () => {
				await Poster.create(true, this);
			});

		},

		/**
		 * 切换海报模板并重新生成
		 */
		switchTemplate: function (e) {
			let idx = Number(e.currentTarget.dataset.idx);
			if (idx === this.data.templateIndex) return;

			this.setData({
				templateIndex: idx,
				isCreate: true,
				isLoad: false
			}, async () => {
				await this.createPoster();
			});
		},

		onPosterFail: function (e) {
			console.log(e)
		},

		bindPosterSuccessListener(e) {
			let img = e.detail;
			this.setData({
				img,
				isLoad: true
			});

		},

		url: function (e) {
			pageHelper.url(e, this);
		},

		bindPosterFailListener(e) {
			console.log(e);
		},

		bindSaveTap: function (e) {
			let that = this;
			let callback = function () {
				wx.saveImageToPhotosAlbum({
					filePath: that.data.img,
					success: function (data) {
						wx.showToast({
							title: '保存成功',
							icon: 'success',
							duration: 1000
						})
					},
				});
			}

			picHelper.getWritePhotosAlbum(callback);
		}


	}
})
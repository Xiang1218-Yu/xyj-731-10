const pageHelper = require('../../../../../helper/page_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');
const EnrollBiz = require('../../../biz/enroll_biz.js');
const PassportBiz = require('../../../../../comm/biz/passport_biz.js');

Page({
	/**
	 * 页面的初始数据
	 */
	data: {
		isLogin: true,

		// 功能点：语音打卡当前播放中的语音fileID（''表示未播放）
		playingVoice: '',
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: function (options) {
		ProjectBiz.initPage(this);
		if (!pageHelper.getOptions(this,options)) return;
		this._getSearchMenu();

		this.setData({
			params:{enrollId:this.data.id}
		});

	},

	/**
	 * 生命周期函数--监听页面初次渲染完成
	 */
	onReady: function () {

	},

	/**
	 * 生命周期函数--监听页面显示
	 */
	onShow: function () {

	},

	/**
	 * 生命周期函数--监听页面隐藏
	 */
	onHide: function () {
		// 功能点：页面隐藏时停止语音播放
		this._stopVoice();
	},

	/**
	 * 生命周期函数--监听页面卸载
	 */
	onUnload: function () {
		// 功能点：页面卸载时销毁语音播放器
		this._stopVoice();
		if (this._voiceAudioCtx) {
			this._voiceAudioCtx.destroy();
			this._voiceAudioCtx = null;
		}
	},

	// 功能点：语音打卡播放/暂停（wx.createInnerAudioContext）
	// 每次切换语音都销毁旧实例并新建，回调中做实例身份校验，避免快速切换时旧实例回调错乱新播放状态
	bindVoiceTap: function (e) {
		let src = pageHelper.dataset(e, 'src');
		if (!src) return;

		// 再次点击同一条语音则停止播放
		if (this.data.playingVoice == src) {
			this._stopVoice();
			return;
		}

		// 销毁旧播放器（旧实例的回调将因身份校验失效）
		this._destroyVoiceCtx();

		let ctx = wx.createInnerAudioContext();
		this._voiceAudioCtx = ctx;
		this.setData({ playingVoice: src });

		ctx.onEnded(() => {
			if (this._voiceAudioCtx === ctx) this._stopVoice();
		});
		ctx.onStop(() => {
			if (this._voiceAudioCtx === ctx) this._stopVoice();
		});
		ctx.onError((res) => {
			console.error('voice play error', res);
			if (this._voiceAudioCtx === ctx) this._stopVoice();
		});

		ctx.src = src; // 直接播放云存储fileID
		ctx.play();
	},

	// 功能点：销毁语音播放器（先置空再停止销毁，防止旧实例回调再次进入）
	_destroyVoiceCtx: function () {
		let ctx = this._voiceAudioCtx;
		this._voiceAudioCtx = null;
		if (ctx) {
			ctx.stop();
			ctx.destroy();
		}
	},

	// 功能点：停止语音播放
	_stopVoice: function () {
		this._destroyVoiceCtx();
		if (this.data.playingVoice) this.setData({ playingVoice: '' });
	},

	/**
	 * 页面相关事件处理函数--监听用户下拉动作
	 */
	onPullDownRefresh: function () {

	},

	/**
	 * 页面上拉触底事件的处理函数
	 */
	onReachBottom: function () {

	},

	/**
	 * 用户点击右上角分享
	 */
	onShareAppMessage: function () {

	},

	url: async function (e) {
		pageHelper.url(e, this);
	},

	bindCommListCmpt: function (e) {
		pageHelper.commListListener(this, e);
	},

	/** 搜索菜单设置 */
	_getSearchMenu: function () {

		let sortItems = [];
		let sortMenus = [
		 
		]

		this.setData({
			search: '',
			sortItems,
			sortMenus,
			isLoad: true
		});

	},

})
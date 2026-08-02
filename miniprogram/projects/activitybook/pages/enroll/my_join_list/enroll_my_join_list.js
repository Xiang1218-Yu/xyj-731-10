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
	bindVoiceTap: function (e) {
		let src = pageHelper.dataset(e, 'src');
		if (!src) return;

		// 再次点击同一条语音则停止播放
		if (this.data.playingVoice == src) {
			this._stopVoice();
			return;
		}

		if (!this._voiceAudioCtx) {
			this._voiceAudioCtx = wx.createInnerAudioContext();
			this._voiceAudioCtx.onEnded(() => this._stopVoice());
			this._voiceAudioCtx.onStop(() => this._stopVoice());
			this._voiceAudioCtx.onError((res) => {
				console.error('voice play error', res);
				this._stopVoice();
			});
		}
		this._voiceAudioCtx.src = src; // 直接播放云存储fileID
		this._voiceAudioCtx.play();
		this.setData({ playingVoice: src });
	},

	// 功能点：停止语音播放
	_stopVoice: function () {
		if (this._voiceAudioCtx) this._voiceAudioCtx.stop();
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
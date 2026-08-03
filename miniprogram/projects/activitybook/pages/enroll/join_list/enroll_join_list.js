const pageHelper = require('../../../../../helper/page_helper.js');
const cloudHelper = require('../../../../../helper/cloud_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

Page({
	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: true,
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: function (options) {
		ProjectBiz.initPage(this);

		if (!pageHelper.getOptions(this, options)) return;
		if (!pageHelper.getOptions(this, options, 'day')) return;

		this.setData({
			_params: {
				enrollId: this.data.id,
				day: this.data.day,
				isLoad: true
			}
		});

		this._innerAudioContext = wx.createInnerAudioContext();
		this._innerAudioContext.onError(() => {
			pageHelper.showNoneToast('语音播放失败');
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

	},

	/**
	 * 生命周期函数--监听页面卸载
	 */
	onUnload: function () {
		if (this._innerAudioContext) {
			this._innerAudioContext.destroy();
			this._innerAudioContext = null;
		}
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

	bindCommListCmpt: function (e) {
		pageHelper.commListListener(this, e);
	},

	url: function (e) {
		pageHelper.url(e, this);
	},

	/** 播放语音 */
	bindPlayVoice: async function (e) {
		let voice = pageHelper.dataset(e, 'voice');
		if (!voice || !voice.tempFileURL) return;

		this._innerAudioContext.stop();
		let src = await cloudHelper.getTempFileURLOne(voice.tempFileURL);
		this._innerAudioContext.src = src || voice.tempFileURL;
		this._innerAudioContext.play();
	},

	/** 打开位置 */
	bindOpenLocation: function (e) {
		let location = pageHelper.dataset(e, 'location');
		if (typeof location === 'string') {
			try { location = JSON.parse(location); } catch (err) { location = null; }
		}
		if (!location || typeof location !== 'object') return;

		let latitude = Number(location.latitude);
		let longitude = Number(location.longitude);
		if (isNaN(latitude) || isNaN(longitude)) {
			console.error('[openLocation] 经纬度非法', location);
			return;
		}

		wx.openLocation({
			latitude,
			longitude,
			name: location.name || '',
			address: location.address || '',
			scale: 18,
			fail: (err) => {
				console.log('[openLocation fail]', err);
				if (err && err.errMsg && err.errMsg.indexOf('cancel') === -1) {
					pageHelper.showModal('打开地图失败：' + (err.errMsg || '未知错误'));
				}
			}
		});
	},

})

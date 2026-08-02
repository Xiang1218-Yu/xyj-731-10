const pageHelper = require('../../../../../helper/page_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

Page({
	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: true,
		// 当前正在播放的语音唯一标识
		voicePlayingKey: '',
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
		// 销毁音频播放器，释放资源
		if (this._audioCtx) {
			this._audioCtx.destroy();
			this._audioCtx = null;
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

	/**
	 * 播放/暂停语音
	 */
	bindVoicePlay: function (e) {
		let key = pageHelper.dataset(e, 'key');
		let fileID = pageHelper.dataset(e, 'voice');

		if (!fileID) return;

		// 如果当前语音正在播放，则停止
		if (this._isPlaying && this._playingKey === key) {
			if (this._audioCtx) {
				this._audioCtx.stop();
			}
			this._isPlaying = false;
			this._playingKey = '';
			this.setData({ voicePlayingKey: '' });
			return;
		}

		let that = this;

		// 初始化音频播放器
		if (!this._audioCtx) {
			this._audioCtx = wx.createInnerAudioContext();

			this._audioCtx.onPlay(() => {
				that._isPlaying = true;
				that.setData({ voicePlayingKey: that._playingKey });
			});

			this._audioCtx.onEnded(() => {
				that._isPlaying = false;
				that._playingKey = '';
				that.setData({ voicePlayingKey: '' });
			});

			this._audioCtx.onError((err) => {
				console.error('语音播放错误', err);
				that._isPlaying = false;
				that._playingKey = '';
				that.setData({ voicePlayingKey: '' });
				wx.showToast({
					title: '播放失败',
					icon: 'none'
				});
			});

			this._audioCtx.onStop(() => {
				that._isPlaying = false;
				that._playingKey = '';
				that.setData({ voicePlayingKey: '' });
			});
		}

		// 如果是云文件ID，需要先获取临时链接
		if (fileID.indexOf('cloud://') === 0) {
			wx.cloud.getTempFileURL({
				fileList: [fileID],
				success(res) {
					if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
						that._playingKey = key;
						that._audioCtx.src = res.fileList[0].tempFileURL;
						that._audioCtx.play();
					} else {
						wx.showToast({
							title: '获取语音链接失败',
							icon: 'none'
						});
					}
				},
				fail(err) {
					console.error('获取临时链接失败', err);
					wx.showToast({
						title: '播放失败',
						icon: 'none'
					});
				}
			});
		} else {
			// 非云文件直接播放
			this._playingKey = key;
			this._audioCtx.src = fileID;
			this._audioCtx.play();
		}
	},

	/**
	 * 在地图中打开位置
	 */
	bindLocationOpen: function (e) {
		let location = pageHelper.dataset(e, 'location');

		if (!location || !location.latitude) return;

		wx.openLocation({
			latitude: location.latitude,
			longitude: location.longitude,
			name: location.name || '',
			address: location.address || '',
			scale: 18
		});
	},

})
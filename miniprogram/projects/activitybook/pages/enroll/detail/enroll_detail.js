const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const timeHelper = require('../../../../../helper/time_helper.js'); 
const PassportBiz = require('../../../../../comm/biz/passport_biz.js'); 

Page({
	/**
	 * 页面的初始数据
	 */
	data: {
		cur: 'content',
		isLoad: false,
		day: timeHelper.time('Y-M-D'),

        isLoadJoinList: false,

        // 当前正在播放的语音唯一标识（格式：列表类型-索引）
        voicePlayingKey: '',

	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: async function (options) {
		//ProjectBiz.initPage(this);

		if (!pageHelper.getOptions(this, options)) return;
		this._loadDetail();

        let _params = {
            enrollId: this.data.id,
            day: this.data.day
        };

        this.setData({
            _params,
            isLoadJoinList: true
        });

        let token = PassportBiz.getToken();
        if (token) {
            this.setData({ user: token.name + timeHelper.time('Y-M-D') + '打卡', avatar: token.pic })
        }

	},

	_loadDetail: async function () {
		let id = this.data.id;
		if (!id) return;

		let params = {
			id,
		};
		let opt = {
			title: 'bar'
		};
		let enroll = await cloudHelper.callCloudData('enroll/view', params, opt);
		if (!enroll) {
			this.setData({
				isLoad: null
			})
			return;
		}

		this.setData({
			isLoad: true,
			enroll,
		});

	},

    bindCancelJoinTap: async function (e) {

        let cb = async () => {
            try {
                let params = {
                    enrollId: this.data.id
                }
                let opts = {
                    title: '取消中'
                }

                await cloudHelper.callCloudSumbit('enroll/my_join_cancel', params, opts).then(res => {
                    let callback = () => {
                        wx.redirectTo({
                            url: 'enroll_detail?id=' + this.data.id,
                        })
                    }
                    pageHelper.showSuccToast('取消成功', 1500, callback);
                });
            } catch (err) {
                console.log(err);
            }
        }

        pageHelper.showConfirm('确认取消? ', cb);


    },

	bindJoinDayTap: async function (e) {
        this.setData({
            isLoadJoinList: false,
        });
		let day = pageHelper.dataset(e, 'day');
        let _params = {
            enrollId: this.data.id,
			day
		};

		this.setData({
            isLoadJoinList: true,
			day,
            _params,
        });

	},

	bindCurTap: function (e) {
		let cur = pageHelper.dataset(e, 'cur');
		this.setData({ cur });
	},

	/**
	 * 生命周期函数--监听页面初次渲染完成
	 */
	onReady: function () { },

	/**
	 * 生命周期函数--监听页面显示
	 */
	onShow: function () { },

	/**
	 * 生命周期函数--监听页面隐藏
	 */
	onHide: function () { },

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
	onPullDownRefresh: async function () {
		await this._loadDetail();
		wx.stopPullDownRefresh();
	},

	/**
	 * 页面上拉触底事件的处理函数
	 */
	onReachBottom: function () { },

    bindCommListCmpt: function (e) {
        pageHelper.commListListener(this, e);
    },

	bindJoinTap: async function (e) {
		if (!await PassportBiz.loginMustCancelWin(this)) return;

        wx.navigateTo({
            url: '../do/enroll_do?id=' + this.data.id,
			})
	},


	url: function (e) {
		pageHelper.url(e, this);
	},

	/**
	 * 播放/暂停语音
	 * 通过 data-key 区分不同列表（打卡动态/我的打卡）中的语音
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


	onPageScroll: function (e) {
		// 回页首按钮
		pageHelper.showTopBtn(e, this);

	},

	onShareAppMessage: function (res) {
		return {
			title: this.data.enroll.ENROLL_TITLE,
			imageUrl: this.data.enroll.ENROLL_OBJ.cover[0]
		}
	}
})
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

		this._innerAudioContext = wx.createInnerAudioContext();
		this._innerAudioContext.onError(() => {
			pageHelper.showNoneToast('语音播放失败');
		});
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
		if (this._innerAudioContext) {
			this._innerAudioContext.destroy();
			this._innerAudioContext = null;
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

		// dataset 传对象在部分场景下可能被序列化为字符串，做兜底解析
		if (typeof location === 'string') {
			try { location = JSON.parse(location); } catch (err) { location = null; }
		}
		if (!location || typeof location !== 'object') return;

		// 经纬度统一转为 Number，微信 openLocation 要求合法数值
		let latitude = Number(location.latitude);
		let longitude = Number(location.longitude);

		// 经纬度为 NaN 时不调用，避免微信内部报错
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
				// 仅在真正失败时提示，避免对合法坐标误报
				if (err && err.errMsg && err.errMsg.indexOf('cancel') === -1) {
					pageHelper.showModal('打开地图失败：' + (err.errMsg || '未知错误'));
				}
			}
		});
	},


	url: function (e) {
		pageHelper.url(e, this);
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
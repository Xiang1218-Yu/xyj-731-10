/** 
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2020-10-29 07:48:00 
 */

const cacheHelper = require('../../../../../helper/cache_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const cloudHelper = require('../../../../../helper/cloud_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');
const AdminBiz = require('../../../../../comm/biz/admin_biz.js');
const setting = require('../../../../../setting/setting.js');
const PassportBiz = require('../../../../../comm/biz/passport_biz.js');
const wxCharts = require('../../../../../lib/tools/wxcharts-min.js');

Page({
	data: {
		stat: null, // 我的数据统计
		chartWidth: 320, // 趋势图宽度（px）
		chartHeight: 160, // 趋势图高度（px）
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: async function (options) {
		if (PassportBiz.isLogin()) {
			let user = {};
			user.USER_NAME = PassportBiz.getUserName();
			this.setData({ user });
		}

		ProjectBiz.initPage(this);

	},

	/**
	 * 生命周期函数--监听页面初次渲染完成
	 */
	onReady: function () {
		// 计算趋势图宽高（rpx转px，750rpx≈屏幕宽度）
		try {
			let sys = wx.getSystemInfoSync();
			let paddingPx = 50 / 750 * sys.windowWidth; // 卡片左右内边距合计约50rpx
			let chartWidth = Math.floor(sys.windowWidth - paddingPx);
			this.setData({
				chartWidth,
				chartHeight: Math.floor(chartWidth * 0.42)
			});
		} catch (e) { }
	},

	/**
	 * 生命周期函数--监听页面显示
	 */
	onShow: async function () {
		PassportBiz.loginSilenceMust(this);
		this._loadUser();
		this._loadStat();
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

	},

	_loadUser: async function (e) {

		let opts = {
			title: 'bar'
		}
		let user = await cloudHelper.callCloudData('passport/my_detail', {}, opts);
		if (!user) {
			this.setData({
				user: null
			});
			return;
		}

		this.setData({
			user
		})
	},

	/**
	 * 加载我的数据统计
	 */
	_loadStat: async function () {
		try {
			let opts = { title: '加载中' };
			let stat = await cloudHelper.callCloudData('my/get_my_stat', {}, opts);
			if (!stat) stat = {};

			this.setData({
				stat
			}, () => {
				this._drawTrendChart(stat.trend);
			});
		} catch (e) {
			console.error(e);
		}
	},

	/**
	 * 绘制近30天打卡趋势折线图
	 * @param {Array} trend 趋势数据，格式 [{date:'MM-DD', cnt:1}]
	 */
	_drawTrendChart: function (trend) {
		if (!trend || !trend.length) return;

		let categories = [];
		let data = [];
		for (let i = 0; i < trend.length; i++) {
			let item = trend[i];
			categories.push(item.date || '');
			data.push(Number(item.cnt) || 0);
		}

		try {
			new wxCharts({
				canvasId: 'statCanvas',
				type: 'line',
				width: this.data.chartWidth,
				height: this.data.chartHeight,
				categories: categories,
				series: [{
					name: '打卡次数',
					data: data,
					color: '#4b94e7',
					format: function (val) {
						return val + '次';
					}
				}],
				xAxis: {
					disableGrid: true,
					fontColor: '#999',
					fontSize: 9
				},
				yAxis: {
					fontColor: '#999',
					fontSize: 9,
					min: 0,
					format: function (val) {
						return val;
					}
				},
				extra: {
					lineStyle: 'curve',
					column: { width: 6 },
					legendTextColor: '#666'
				},
				dataLabel: false,
				dataPointShape: true,
				legend: false,
				animation: true,
				background: '#ffffff'
			});
		} catch (e) {
			console.error('绘制趋势图失败', e);
		}
	},

	/**
	 * 页面相关事件处理函数--监听用户下拉动作
	 */
	onPullDownRefresh: async function () {
		await this._loadUser();
		await this._loadStat();
		wx.stopPullDownRefresh();
	},

	/**
	 * 页面上拉触底事件的处理函数
	 */
	onReachBottom: function () {

	},


	/**
	 * 用户点击右上角分享
	 */
	onShareAppMessage: function () { },

	url: function (e) {
		pageHelper.url(e, this);
	},

	bindSetTap: function (e, skin) {
		let itemList = ['清除缓存', '后台管理'];
		wx.showActionSheet({
			itemList,
			success: async res => {
				let idx = res.tapIndex;
				if (idx == 0) {
					cacheHelper.clear();
					pageHelper.showNoneToast('清除缓存成功');
				}

				if (idx == 1) {
					if (setting.IS_SUB) {
						AdminBiz.adminLogin(this, 'admin', '123456');
					} else {
						wx.reLaunch({
							url: '../../admin/index/login/admin_login',
						});
					}

				}

			},
			fail: function (res) { }
		})
	}
})
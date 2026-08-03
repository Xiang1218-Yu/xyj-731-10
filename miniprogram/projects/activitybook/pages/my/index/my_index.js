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
		stat: null, // 统计数据
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
		this._isReady = true;
		// 若统计数据已就绪则初始化图表
		if (this.data.stat) {
			this._initChart(this.data.stat);
		}
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
	 * 加载我的统计数据
	 */
	_loadStat: async function () {
		let opts = {
			title: 'bar'
		}
		let stat = await cloudHelper.callCloudData('my/stat', {}, opts);
		if (!stat) {
			this.setData({
				stat: null
			});
			return;
		}

		this.setData({
			stat
		}, () => {
			// 数据渲染完成后，若页面已就绪则初始化图表
			if (this._isReady) {
				this._initChart(stat);
			}
		});
	},

	/**
	 * 初始化最近30天打卡趋势折线图
	 */
	_initChart: function (stat) {
		if (!stat || !stat.last30DaysTrend || !stat.last30DaysTrend.length) return;

		let trend = stat.last30DaysTrend;
		let categories = trend.map(item => item.date);
		let data = trend.map(item => item.count);

		// 获取屏幕宽度以自适应图表尺寸
		let systemInfo = wx.getSystemInfoSync();
		let chartWidth = systemInfo.windowWidth - 50; // 减去左右padding

		this.chart = new wxCharts({
			canvasId: 'statChart',
			type: 'line',
			categories: categories,
			series: [{
				name: '打卡次数',
				data: data,
				color: '#4b94e7',
				format: function (val) {
					return val + '次';
				}
			}],
			yAxis: {
				title: '打卡次数',
				format: function (val) {
					return val;
				},
				min: 0
			},
			width: chartWidth,
			height: 200,
			dataLabel: false,
			dataPointShape: true,
			enableScroll: true,
			extra: {
				lineStyle: 'curve',
				legendTextColor: '#333333'
			}
		});
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
					} else if (setting.ADMIN_NO_LOGIN) {
						// 免登录模式直接进后台首页
						wx.reLaunch({
							url: '../../admin/index/home/admin_home',
						});
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
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
const wxCharts = require('../../../../../lib/tools/wxcharts-min.js'); // 功能点：数据统计图表库

Page({
	data: {
		// 功能点：我的数据统计
		stat: null, // 统计数据（null表示未登录或未加载）
		statCanvasWidth: 320, // 统计柱状图画布宽度(px)
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

		// 功能点：计算统计图表画布宽度（页面左右留白约110rpx）
		let windowWidth = 375;
		try {
			if (wx.getWindowInfo)
				windowWidth = wx.getWindowInfo().windowWidth;
			else
				windowWidth = wx.getSystemInfoSync().windowWidth;
		} catch (e) {
			console.error(e);
		}
		this.setData({
			statCanvasWidth: Math.floor(windowWidth * 640 / 750)
		});

	},

	/**
	 * 生命周期函数--监听页面初次渲染完成
	 */
	onReady: function () { },

	/**
	 * 生命周期函数--监听页面显示
	 */
	onShow: async function () {
		await PassportBiz.loginSilenceMust(this);
		this._loadUser();
		this._loadStat(); // 功能点：加载我的数据统计
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

	// 功能点：加载我的数据统计（云端接口 my/data_stat）
	_loadStat: async function () {
		// 未登录用户不加载统计，页面显示登录引导
		if (!PassportBiz.isLogin()) {
			this.setData({
				stat: null
			});
			return;
		}

		let opts = {
			title: 'bar'
		}
		let stat = await cloudHelper.callCloudData('my/data_stat', {}, opts);
		if (!stat) return;

		this.setData({
			stat
		});

		// 功能点：渲染近7天打卡次数柱状图
		this._drawStatChart(stat.weekList || []);
	},

	// 功能点：渲染近7天打卡次数柱状图（wxcharts-min.js）
	_drawStatChart: function (weekList) {
		let categories = [];
		let seriesData = [];
		for (let k = 0; k < weekList.length; k++) {
			categories.push(weekList[k].label); // 横坐标 M-D
			seriesData.push(weekList[k].cnt); // 每日打卡次数
		}

		new wxCharts({
			canvasId: 'statCanvas',
			type: 'column',
			legend: false,
			categories: categories,
			series: [{
				name: '打卡次数',
				data: seriesData,
				color: '#FFC700' // 项目主题色
			}],
			yAxis: {
				min: 0,
				format: function (val) {
					return val.toFixed(0); // 纵坐标取整显示
				}
			},
			xAxis: {
				disableGrid: true
			},
			extra: {
				column: {
					width: 15 // 柱体宽度(px)
				}
			},
			width: this.data.statCanvasWidth,
			height: 180
		});
	},

	/**
	 * 页面相关事件处理函数--监听用户下拉动作
	 */
	onPullDownRefresh: async function () {
		await this._loadUser();
		await this._loadStat(); // 功能点：下拉刷新同时刷新数据统计
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
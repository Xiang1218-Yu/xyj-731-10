/** 
 * Notes: 我的站内通知（功能点：站内通知中心）
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2026-08-02 10:00:00
 */

const pageHelper = require('../../../../../helper/page_helper.js');
const cloudHelper = require('../../../../../helper/cloud_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false // 列表是否已初始化
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: function (options) {
		ProjectBiz.initPage(this);

		// 无搜索菜单，直接初始化列表
		this.setData({
			isLoad: true
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

	/** 点击通知：标记已读并按类型跳转 */
	bindItemTap: async function (e) {
		let idx = Number(pageHelper.dataset(e, 'idx'));
		let notice = this.data.dataList.list[idx];
		if (!notice) return;

		// 未读的通知先标记已读，并同步更新本地列表红点状态
		if (notice.NOTICE_READ == 0) {
			cloudHelper.callCloudSumbitAsync('my/notice_read', {
				noticeId: notice._id
			});
			this.data.dataList.list[idx].NOTICE_READ = 1;
			this.setData({
				dataList: this.data.dataList
			});
		}

		// 按通知类型跳转：1=报名审核结果 → 报名详情页
		if (notice.NOTICE_TYPE == 1 && notice.NOTICE_JOIN_ID) {
			wx.navigateTo({
				url: '../../activity/my_join_detail/activity_my_join_detail?id=' + notice.NOTICE_JOIN_ID
			});
		}
	}
})

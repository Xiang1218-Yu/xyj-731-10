const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const pageHelper = require('../../../../../../helper/page_helper.js');  

Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		name: '',
		pwd: '',
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: function (options) {
		const setting = require('../../../../../../setting/setting.js');
		if (setting.ADMIN_NO_LOGIN) {
			// 免登录模式：直接写入管理员token并跳转，不清除
			let admin = AdminBiz.getAdminToken();
			if (!admin) {
				admin = { name: 'admin', type: 1, token: 'admin-no-login-token' };
				const cacheHelper = require('../../../../../../helper/cache_helper.js');
				const constants = require('../../../../../../comm/constants.js');
				cacheHelper.set(constants.CACHE_ADMIN, admin, constants.ADMIN_TOKEN_EXPIRE);
			}
			wx.redirectTo({
				url: pageHelper.fmtURLByPID('/pages/admin/index/home/admin_home'),
			});
		} else {
			AdminBiz.clearAdminToken();
		}
	},

	/**
	 * 生命周期函数--监听页面初次渲染完成
	 */
	onReady: function () {

	},

	/**
	 * 生命周期函数--监听页面显示
	 */
	onShow: function () {},

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

	url: function (e) {
		pageHelper.url(e, this);
	},

	bindBackTap: function (e) {
		wx.reLaunch({
			url: pageHelper.fmtURLByPID('/pages/my/index/my_index'),
		});
	},

	bindLoginTap: async function (e) {
		return AdminBiz.adminLogin(this, this.data.name, this.data.pwd);
	}

})

const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const pageHelper = require('../../../../../../helper/page_helper.js');
const cloudHelper = require('../../../../../../helper/cloud_helper.js');

Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,

		// 分组列表
		list: [],

		// 编辑弹窗
		editModalShow: false,
		formId: '',
		formTitle: '',
		formOrder: 9999
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: async function (options) {
		if (!AdminBiz.isAdmin(this)) return;

		await this._loadList();
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
	onPullDownRefresh: async function () {
		await this._loadList();
		wx.stopPullDownRefresh();
	},

	/**
	 * 加载分组列表
	 */
	_loadList: async function () {
		try {
			let opts = {
				title: '加载中'
			}
			let list = await cloudHelper.callCloudData('admin/user_group_list', {}, opts);
			this.setData({
				list: list || [],
				isLoad: true
			});
		} catch (e) {
			console.log(e);
			this.setData({
				isLoad: true
			});
		}
	},

	/**
	 * 新建分组
	 */
	bindNewTap: function (e) {
		this.setData({
			editModalShow: true,
			formId: '',
			formTitle: '',
			formOrder: 9999
		});
	},

	/**
	 * 编辑分组
	 */
	bindEditTap: function (e) {
		let idx = pageHelper.dataset(e, 'idx');
		let item = this.data.list[idx];
		if (!item) return;

		this.setData({
			editModalShow: true,
			formId: item.USER_GROUP_ID,
			formTitle: item.USER_GROUP_TITLE,
			formOrder: item.USER_GROUP_ORDER
		});
	},

	/**
	 * 删除分组
	 */
	bindDelTap: function (e) {
		if (!AdminBiz.isAdmin(this)) return;

		let idx = pageHelper.dataset(e, 'idx');
		let item = this.data.list[idx];
		if (!item) return;

		let id = item.USER_GROUP_ID;

		let callback = async () => {
			try {
				let params = {
					id
				}
				await cloudHelper.callCloudSumbit('admin/user_group_del', params, { title: '删除中' }).then(res => {
					let list = this.data.list;
					list.splice(idx, 1);
					this.setData({
						list
					});
					pageHelper.showSuccToast('删除成功');
				});
			} catch (e) {
				console.log(e);
			}
		}

		pageHelper.showConfirm('确认删除该分组？删除后该分组下的用户将变为无分组', callback);
	},

	/**
	 * 保存（弹窗确定）
	 */
	bindSaveCmpt: async function (e) {
		if (!AdminBiz.isAdmin(this)) return;

		let { formId, formTitle, formOrder } = this.data;

		if (!formTitle || !formTitle.trim()) {
			pageHelper.showModal('请输入分组名称');
			return;
		}
		formTitle = formTitle.trim();
		if (formTitle.length > 20) {
			pageHelper.showModal('分组名称不能超过20个字符');
			return;
		}

		formOrder = Number(formOrder);
		if (isNaN(formOrder) || formOrder < 0 || formOrder > 9999) {
			formOrder = 9999;
		}

		let params = {
			id: formId || '',
			title: formTitle,
			order: formOrder
		}

		try {
			await cloudHelper.callCloudSumbit('admin/user_group_save', params, { title: '保存中' }).then(res => {
				this.setData({
					editModalShow: false
				});
				pageHelper.showSuccToast('保存成功', 1500, () => {
					this._loadList();
				});
			});
		} catch (e) {
			console.log(e);
		}
	},

	url: function (e) {
		pageHelper.url(e, this);
	}
})

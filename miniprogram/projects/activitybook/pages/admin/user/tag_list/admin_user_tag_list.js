const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const pageHelper = require('../../../../../../helper/page_helper.js');
const cloudHelper = require('../../../../../../helper/cloud_helper.js');

// 预设颜色色板
const COLOR_OPTIONS = [
	'#19b6ee', // 蓝
	'#f79091', // 红
	'#26d9f5', // 青
	'#ffc700', // 黄
	'#a78bfa', // 紫
	'#34d399', // 绿
	'#fb923c', // 橙
	'#60a5fa'  // 浅蓝
];

Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,

		// 标签列表
		list: [],

		// 编辑弹窗
		editModalShow: false,
		formId: '',
		formTitle: '',
		formColor: COLOR_OPTIONS[0],
		formOrder: 9999,

		// 颜色选项
		colorOptions: COLOR_OPTIONS
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
	 * 加载标签列表
	 */
	_loadList: async function () {
		try {
			let opts = {
				title: '加载中'
			}
			let list = await cloudHelper.callCloudData('admin/user_tag_list', {}, opts);
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
	 * 新建标签
	 */
	bindNewTap: function (e) {
		this.setData({
			editModalShow: true,
			formId: '',
			formTitle: '',
			formColor: COLOR_OPTIONS[0],
			formOrder: 9999
		});
	},

	/**
	 * 编辑标签
	 */
	bindEditTap: function (e) {
		let idx = pageHelper.dataset(e, 'idx');
		let item = this.data.list[idx];
		if (!item) return;

		this.setData({
			editModalShow: true,
			formId: item.USER_TAG_ID,
			formTitle: item.USER_TAG_TITLE,
			formColor: item.USER_TAG_COLOR || COLOR_OPTIONS[0],
			formOrder: item.USER_TAG_ORDER
		});
	},

	/**
	 * 删除标签
	 */
	bindDelTap: function (e) {
		if (!AdminBiz.isAdmin(this)) return;

		let idx = pageHelper.dataset(e, 'idx');
		let item = this.data.list[idx];
		if (!item) return;

		let id = item.USER_TAG_ID;

		let callback = async () => {
			try {
				let params = {
					id
				}
				await cloudHelper.callCloudSumbit('admin/user_tag_del', params, { title: '删除中' }).then(res => {
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

		pageHelper.showConfirm('确认删除该标签？删除后用户身上的该标签也会被清除', callback);
	},

	/**
	 * 选择颜色
	 */
	bindColorTap: function (e) {
		let color = pageHelper.dataset(e, 'color');
		this.setData({
			formColor: color
		});
	},

	/**
	 * 保存（弹窗确定）
	 */
	bindSaveCmpt: async function (e) {
		if (!AdminBiz.isAdmin(this)) return;

		let { formId, formTitle, formColor, formOrder } = this.data;

		if (!formTitle || !formTitle.trim()) {
			pageHelper.showModal('请输入标签名称');
			return;
		}
		formTitle = formTitle.trim();
		if (formTitle.length > 20) {
			pageHelper.showModal('标签名称不能超过20个字符');
			return;
		}

		formOrder = Number(formOrder);
		if (isNaN(formOrder) || formOrder < 0 || formOrder > 9999) {
			formOrder = 9999;
		}

		let params = {
			id: formId || '',
			title: formTitle,
			color: formColor,
			order: formOrder
		}

		try {
			await cloudHelper.callCloudSumbit('admin/user_tag_save', params, { title: '保存中' }).then(res => {
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

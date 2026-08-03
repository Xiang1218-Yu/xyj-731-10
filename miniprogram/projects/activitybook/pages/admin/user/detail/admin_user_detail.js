const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const pageHelper = require('../../../../../../helper/page_helper.js');
const cloudHelper = require('../../../../../../helper/cloud_helper.js');
const projectSetting = require('../../../../public/project_setting.js');

Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,

		// 标签/分组编辑弹窗相关
		tagModalShow: false, // 打标签弹窗是否显示
		groupModalShow: false, // 设分组弹窗是否显示
		groupPresets: projectSetting.USER_GROUP_PRESETS, // 预置分组
		tagItems: [], // 打标签弹窗中的预置标签勾选状态 [{tag,sel}]
		formCustomTag: '', // 打标签弹窗中输入的自定义标签
		formGroup: null, // 设分组弹窗中选中的分组（null=未选择）
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	async onLoad(options) {
		if (!AdminBiz.isAdmin(this)) return;
		if (!pageHelper.getOptions(this, options)) return;

		this._loadDetail();
	},

	/**
	 * 生命周期函数--监听页面初次渲染完成
	 */
	onReady() {

	},

	/**
	 * 生命周期函数--监听页面显示
	 */
	onShow() {

	},

	/**
	 * 生命周期函数--监听页面隐藏
	 */
	onHide() {

	},

	/**
	 * 生命周期函数--监听页面卸载
	 */
	onUnload() {

	},

	/**
	 * 页面相关事件处理函数--监听用户下拉动作
	 */
	async onPullDownRefresh() {
		await this._loadDetail();
		wx.stopPullDownRefresh();
	},

	/**
	 * 页面上拉触底事件的处理函数
	 */
	onReachBottom() {

	},

	/**
	 * 用户点击右上角分享
	 */
	onShareAppMessage() {

	},

	_loadDetail: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		let id = this.data.id;
		if (!id) return;

		let params = {
			id
		}
		let opts = {
			hint: false
		}
		let user = await cloudHelper.callCloudData('admin/user_detail', params, opts);
		if (!user) {
			this.setData({
				isLoad: null,
			})
			return;
		};

		this.setData({
			isLoad: true,
			user
		})
	},
	url(e) {
		pageHelper.url(e, this);
	},

	/** 打开编辑标签弹窗（回显当前用户已有标签） */
	bindEditTagTap: function () {
		if (!AdminBiz.isAdmin(this)) return;
		let user = this.data.user;
		if (!user) return;

		let curTags = user.USER_TAGS || [];
		// 预置标签勾选状态；用户已有的自定义标签也并入列表回显
		let tagItems = projectSetting.USER_TAG_PRESETS.map(tag => ({ tag, sel: curTags.includes(tag) }));
		for (let k = 0; k < curTags.length; k++) {
			if (!projectSetting.USER_TAG_PRESETS.includes(curTags[k]))
				tagItems.push({ tag: curTags[k], sel: true });
		}

		this.setData({
			tagItems,
			formCustomTag: '',
			tagModalShow: true,
		});
	},

	/** 打标签弹窗-勾选/取消勾选标签 */
	bindTagItemTap: function (e) {
		let idx = Number(pageHelper.dataset(e, 'idx'));
		let tagItems = this.data.tagItems;
		tagItems[idx].sel = !tagItems[idx].sel;
		this.setData({ tagItems });
	},

	/** 打标签弹窗-确定（保存该用户标签，整体覆盖） */
	bindTagCmpt: async function () {
		if (!AdminBiz.isAdmin(this)) return;
		let id = this.data.id;
		if (!id) return;

		// 合并勾选标签与自定义标签，去空去重
		let tags = this.data.tagItems.filter(item => item.sel).map(item => item.tag);
		let customTag = (this.data.formCustomTag || '').trim();
		if (customTag && !tags.includes(customTag)) tags.push(customTag);

		try {
			let params = { ids: [id], tags };
			await cloudHelper.callCloudSumbit('admin/user_tag', params).then(res => {
				this.setData({ tagModalShow: false });
				pageHelper.showSuccToast('设置成功');
				this._loadDetail(); // 刷新详情
			});
		} catch (e) {
			console.log(e);
		}
	},

	/** 打开设分组弹窗（回显当前用户分组） */
	bindEditGroupTap: function () {
		if (!AdminBiz.isAdmin(this)) return;
		let user = this.data.user;
		if (!user) return;

		this.setData({
			formGroup: user.USER_GROUP || '',
			groupModalShow: true,
		});
	},

	/** 设分组弹窗-单选分组 */
	bindGroupItemTap: function (e) {
		let group = pageHelper.dataset(e, 'group');
		this.setData({ formGroup: group });
	},

	/** 设分组弹窗-确定（保存该用户分组） */
	bindGroupCmpt: async function () {
		if (!AdminBiz.isAdmin(this)) return;
		let id = this.data.id;
		if (!id) return;

		// null表示未选择，空字符串表示清除分组
		if (this.data.formGroup === null) return pageHelper.showNoneToast('请选择分组');
		let group = this.data.formGroup;

		try {
			let params = { ids: [id], group };
			await cloudHelper.callCloudSumbit('admin/user_group', params).then(res => {
				this.setData({ groupModalShow: false });
				pageHelper.showSuccToast('设置成功');
				this._loadDetail(); // 刷新详情
			});
		} catch (e) {
			console.log(e);
		}
	},
})
const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const pageHelper = require('../../../../../../helper/page_helper.js');
const cloudHelper = require('../../../../../../helper/cloud_helper.js');

Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,

		// 标签和分组选项
		tagList: [],
		groupList: [],

		// 用户当前标签和分组（选择器中使用）
		selectedTags: [],
		selectedGroup: '',

		// 弹窗
		tagModalShow: false,
		groupModalShow: false,

		// 弹窗中带选中标记的标签选项
		tagOptions: []
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	async onLoad(options) {
		if (!AdminBiz.isAdmin(this)) return;
		if (!pageHelper.getOptions(this, options)) return;

		this._loadDetail();
		this._loadOptions();
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
			user,
			selectedTags: user.USER_TAGS || [],
			selectedGroup: user.USER_GROUP || ''
		})

		// 若选项已加载，同步显示文本
		this._syncDisplayNames();
	},

	/**
	 * 加载标签和分组选项
	 */
	_loadOptions: async function () {
		try {
			let [tagList, groupList] = await Promise.all([
				cloudHelper.callCloudData('admin/user_tag_list', {}, { hint: false }),
				cloudHelper.callCloudData('admin/user_group_list', {}, { hint: false })
			]);

			this.setData({
				tagList: tagList || [],
				groupList: groupList || []
			});

			this._syncDisplayNames();
		} catch (e) {
			console.log(e);
		}
	},

	/**
	 * 同步当前用户的标签名称和分组名称展示
	 */
	_syncDisplayNames: function () {
		let { user, tagList, groupList } = this.data;
		if (!user) return;

		// 标签对象数组（带名称和颜色）
		let userTagIds = user.USER_TAGS || [];
		let userTags = [];
		for (let k = 0; k < userTagIds.length; k++) {
			let tag = tagList.find(t => t.USER_TAG_ID === userTagIds[k]);
			if (tag) {
				userTags.push({
					id: tag.USER_TAG_ID,
					title: tag.USER_TAG_TITLE,
					color: tag.USER_TAG_COLOR
				});
			}
		}

		// 分组名称
		let groupName = '无分组';
		if (user.USER_GROUP) {
			let group = groupList.find(g => g.USER_GROUP_ID === user.USER_GROUP);
			if (group) groupName = group.USER_GROUP_TITLE;
		}

		this.setData({
			userTags,
			groupName
		});
	},

	/**
	 * 打开标签选择弹窗
	 */
	bindEditTagsTap: function (e) {
		// 用当前用户的标签初始化选中
		let selectedTags = this.data.user ? (this.data.user.USER_TAGS || []) : [];
		this.setData({
			tagModalShow: true,
			selectedTags,
			tagOptions: this._buildTagOptions(selectedTags)
		});
	},

	/**
	 * 根据选中的标签ID构造带checked标记的选项列表
	 */
	_buildTagOptions: function (selectedTags) {
		let tagList = this.data.tagList || [];
		let options = [];
		for (let k = 0; k < tagList.length; k++) {
			let tag = tagList[k];
			options.push({
				USER_TAG_ID: tag.USER_TAG_ID,
				USER_TAG_TITLE: tag.USER_TAG_TITLE,
				USER_TAG_COLOR: tag.USER_TAG_COLOR,
				checked: selectedTags.indexOf(tag.USER_TAG_ID) >= 0
			});
		}
		return options;
	},

	/**
	 * 切换标签选中（checkbox 多选）
	 */
	bindTagCheckTap: function (e) {
		let id = pageHelper.dataset(e, 'id');
		let selectedTags = this.data.selectedTags || [];

		let idx = selectedTags.indexOf(id);
		if (idx >= 0) {
			selectedTags.splice(idx, 1);
		} else {
			selectedTags.push(id);
		}

		this.setData({
			selectedTags,
			tagOptions: this._buildTagOptions(selectedTags)
		});
	},

	/**
	 * 保存标签
	 */
	bindSaveTagsCmpt: async function (e) {
		if (!AdminBiz.isAdmin(this)) return;

		let userId = this.data.id;
		let tags = this.data.selectedTags || [];

		try {
			await cloudHelper.callCloudSumbit('admin/user_set_tags', {
				userId,
				tags
			}, { title: '保存中' }).then(res => {
				this.setData({
					tagModalShow: false
				});
				pageHelper.showSuccToast('设置成功', 1500, () => {
					this._loadDetail();
				});
			});
		} catch (e) {
			console.log(e);
		}
	},

	/**
	 * 打开分组选择弹窗
	 */
	bindEditGroupTap: function (e) {
		this.setData({
			groupModalShow: true,
			selectedGroup: this.data.user ? (this.data.user.USER_GROUP || '') : ''
		});
	},

	/**
	 * 选择分组（radio 单选，含无分组）
	 */
	bindGroupRadioTap: function (e) {
		let id = pageHelper.dataset(e, 'id') || '';
		this.setData({
			selectedGroup: id
		});
	},

	/**
	 * 保存分组
	 */
	bindSaveGroupCmpt: async function (e) {
		if (!AdminBiz.isAdmin(this)) return;

		let userId = this.data.id;
		let groupId = this.data.selectedGroup || '';

		try {
			await cloudHelper.callCloudSumbit('admin/user_set_group', {
				userId,
				groupId
			}, { title: '保存中' }).then(res => {
				this.setData({
					groupModalShow: false
				});
				pageHelper.showSuccToast('设置成功', 1500, () => {
					this._loadDetail();
				});
			});
		} catch (e) {
			console.log(e);
		}
	},

	url(e) {
		pageHelper.url(e, this);
	}
})

const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const pageHelper = require('../../../../../../helper/page_helper.js');
const cacheHelper = require('../../../../../../helper/cache_helper.js');
const cloudHelper = require('../../../../../../helper/cloud_helper.js');
const projectSetting = require('../../../../public/project_setting.js');

const CACHE_USER_CHECK_REASON = 'CACHE_USER_CHECK_REASON';

Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		userRegCheck: projectSetting.USER_REG_CHECK,
		checkModalShow: false,

		formReason: '',
		curIdx: -1,

		// 批量操作
		isBatchMode: false,
		selectedIds: [],

		// 标签弹窗
		tagModalShow: false,
		selectedTagIds: [],
		tagMode: 'add', // add / remove / set

		// 分组弹窗
		groupModalShow: false,
		selectedGroupId: '',

		// 标签和分组选项（用于列表展示名称/颜色）
		tagList: [],
		groupList: [],
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: async function (options) {
		if (!AdminBiz.isAdmin(this)) return;

		//设置搜索菜单
		await this._getSearchMenu();

		// 加载标签和分组，用于列表中展示名称/颜色
		this._loadTagGroupOptions();
	},

	/**
	 * 生命周期函数--监听页面初次渲染完成
	 */
	onReady: function () {

	},

	/**
	 * 生命周期函数--监听页面显示
	 */
	onShow: async function () {},

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

	url: async function (e) {
		pageHelper.url(e, this);
	},


	bindCommListCmpt: function (e) {
		pageHelper.commListListener(this, e);

		// 为每个用户附加标签对象和分组名称，便于展示
		if (this.data.dataList && this.data.dataList.list && this.data.dataList.list.length > 0) {
			// 同步批量选中 _checked 标记
			if (this.data.isBatchMode && this.data.selectedIds.length > 0) {
				let selectedIds = this.data.selectedIds;
				for (let k = 0; k < this.data.dataList.list.length; k++) {
					this.data.dataList.list[k]._checked = selectedIds.indexOf(this.data.dataList.list[k].USER_MINI_OPENID) >= 0;
				}
			}
			this._enrichList();
		}
	},

	bindDelTap: async function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let id = pageHelper.dataset(e, 'id');

		let params = {
			id
		}

		let callback = async () => {
			try {
				let opts = {
					title: '删除中'
				}
				await cloudHelper.callCloudSumbit('admin/user_del', params, opts).then(res => {
					
					pageHelper.delListNode(id, this.data.dataList.list, 'USER_MINI_OPENID');
					this.data.dataList.total--;
					this.setData({
						dataList: this.data.dataList
					});
					pageHelper.showSuccToast('删除成功');
				});
			} catch (e) {
				console.log(e);
			}
		}
		pageHelper.showConfirm('确认删除？删除不可恢复', callback);

	},


	bindClearReasonTap: function (e) {
		this.setData({
			formReason: ''
		})
	},

	bindCheckTap: function (e) {
		let curIdx = pageHelper.dataset(e, 'idx');
		this.setData({
			formReason: cacheHelper.get(CACHE_USER_CHECK_REASON) || '',
			curIdx,
			checkModalShow: true,
		});
	},

	bindCheckCmpt: async function () {
		let e = {
			currentTarget: {
				dataset: {
					status: 8,
					idx: this.data.curIdx
				}
			}
		}
		cacheHelper.set(CACHE_USER_CHECK_REASON, this.data.formReason, 86400 * 365);
		await this.bindStatusTap(e);
	},

	bindStatusTap: async function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let status = pageHelper.dataset(e, 'status');

		let idx = Number(pageHelper.dataset(e, 'idx'));

		let dataList = this.data.dataList;
		let id = dataList.list[idx].USER_MINI_OPENID;

		let params = {
			id,
			status,
			reason: this.data.formReason
		}

		let cb = async () => {
		try {
			await cloudHelper.callCloudSumbit('admin/user_status', params).then(res => {
					let sortIndex = this.selectComponent('#cmpt-comm-list').getSortIndex();
 
					if (sortIndex != -1 && sortIndex != 5 && !this.data.search) { // 全部或者检索的结果
						dataList.list.splice(idx, 1);
						dataList.total--;
				this.setData({
					dataList: this.data.dataList
				});
					} else {
						let data1Name = 'dataList.list[' + idx + '].USER_CHECK_REASON';
						let data2Name = 'dataList.list[' + idx + '].USER_STATUS';
						this.setData({
							[data1Name]: this.data.formReason,
							[data2Name]: status
						});
					}

					this.setData({
						checkModalShow: false,
						formReason: '',
						curIdx: -1,
					});
					pageHelper.showSuccToast('操作成功');
			});
		} catch (e) {
			console.log(e);
		}
		}

		if (status == 8) {
			pageHelper.showConfirm('该用户审核不通过，用户修改资料后可重新提交审核', cb)
		}
		else
			pageHelper.showConfirm('确认执行此操作?', cb);
	},

	/**
	 * 加载标签和分组选项，用于列表展示
	 */
	_loadTagGroupOptions: async function () {
		try {
			let [tagList, groupList] = await Promise.all([
				cloudHelper.callCloudData('admin/user_tag_list', {}, { hint: false }),
				cloudHelper.callCloudData('admin/user_group_list', {}, { hint: false })
			]);
			this.setData({
				tagList: tagList || [],
				groupList: groupList || []
			});

			// 选项加载完成后，若列表已加载，补充展示信息
			if (this.data.dataList && this.data.dataList.list && this.data.dataList.list.length > 0) {
				this._enrichList();
			}
		} catch (e) {
			console.log(e);
		}
	},

	/**
	 * 为列表中的用户附加标签对象和分组名称
	 */
	_enrichList: function () {
		let dataList = this.data.dataList;
		if (!dataList || !dataList.list) return;

		let tagList = this.data.tagList;
		let groupList = this.data.groupList;

		for (let k = 0; k < dataList.list.length; k++) {
			let user = dataList.list[k];

			// 标签
			let tagIds = user.USER_TAGS || [];
			let tags = [];
			for (let j = 0; j < tagIds.length; j++) {
				let tag = tagList.find(t => t.USER_TAG_ID === tagIds[j]);
				if (tag) {
					tags.push({
						id: tag.USER_TAG_ID,
						title: tag.USER_TAG_TITLE,
						color: tag.USER_TAG_COLOR
					});
				}
			}
			user._tags = tags;

			// 分组
			let groupName = '';
			if (user.USER_GROUP) {
				let group = groupList.find(g => g.USER_GROUP_ID === user.USER_GROUP);
				if (group) groupName = group.USER_GROUP_TITLE;
			}
			user._groupName = groupName;
		}

		this.setData({
			dataList
		});
	},

	// ==================== 批量操作 ====================

	// 切换批量模式
	bindToggleBatch: function () {
		let isBatchMode = !this.data.isBatchMode;
		this._setSelectedIds([]);
		this.setData({
			isBatchMode,
			tagModalShow: false,
			groupModalShow: false,
			selectedTagIds: [],
			selectedGroupId: ''
		});
	},

	// 选中/取消某条
	bindSelectItem: function (e) {
		let id = pageHelper.dataset(e, 'id');
		if (!id) return;
		let selectedIds = this.data.selectedIds.slice();
		let idx = selectedIds.indexOf(id);
		if (idx >= 0) selectedIds.splice(idx, 1);
		else selectedIds.push(id);
		this._setSelectedIds(selectedIds);
	},

	// 全选/取消全选
	bindSelectAll: function (e) {
		let dataList = this.data.dataList;
		if (!dataList || !dataList.list) return;
		let isAll = (this.data.selectedIds.length === dataList.list.length);
		let selectedIds = isAll ? [] : dataList.list.map(item => item.USER_MINI_OPENID);
		this._setSelectedIds(selectedIds);
	},

	// 更新选中并同步列表 _checked 标记
	_setSelectedIds: function (selectedIds) {
		let dataList = this.data.dataList;
		if (dataList && dataList.list) {
			for (let k = 0; k < dataList.list.length; k++) {
				dataList.list[k]._checked = selectedIds.indexOf(dataList.list[k].USER_MINI_OPENID) >= 0;
			}
		}
		this.setData({ selectedIds, dataList });
	},

	_checkSelected: function () {
		if (!this.data.selectedIds || this.data.selectedIds.length === 0) {
			pageHelper.showModal('请先选择要操作的用户');
			return false;
		}
		return true;
	},

	_reloadAfterBatch: async function () {
		try {
			await this.selectComponent('#cmpt-comm-list').reload();
		} catch (err) {
			console.error(err);
		}
		this._setSelectedIds([]);
	},

	// 批量状态（启用/禁用）
	bindBatchStatus: function (e) {
		if (!this._checkSelected()) return;
		let status = Number(pageHelper.dataset(e, 'status'));
		let userIds = this.data.selectedIds;
		let statusDesc = status === 1 ? '启用' : '禁用';
		let callback = async () => {
			try {
				await cloudHelper.callCloudSumbit('admin/user_batch_status', { userIds, status }, { title: '处理中' });
				pageHelper.showSuccToast(`批量${statusDesc}成功`, 1000);
				await this._reloadAfterBatch();
			} catch (err) {
				console.error(err);
			}
		};
		pageHelper.showConfirm(`确认批量${statusDesc}选中的 ${userIds.length} 个用户？`, callback);
	},

	// 批量删除
	bindBatchDel: function () {
		if (!this._checkSelected()) return;
		let userIds = this.data.selectedIds;
		let callback = async () => {
			try {
				await cloudHelper.callCloudSumbit('admin/user_batch_del', { userIds }, { title: '删除中' });
				pageHelper.showSuccToast('批量删除成功', 1000);
				await this._reloadAfterBatch();
			} catch (err) {
				console.error(err);
			}
		};
		pageHelper.showConfirm(`确认批量删除选中的 ${userIds.length} 个用户？删除不可恢复`, callback);
	},

	// 打开打标签弹窗
	bindOpenTagModal: async function () {
		if (!this._checkSelected()) return;
		// 确保标签选项已加载
		let tagList = this.data.tagList;
		if (!tagList || tagList.length === 0) {
			try {
				tagList = await cloudHelper.callCloudData('admin/user_tag_list', {}, { hint: false });
				tagList = tagList || [];
			} catch (e) {
				console.log(e);
				tagList = [];
			}
		}
		this.setData({
			tagModalShow: true,
			selectedTagIds: [],
			tagMode: 'add',
			tagList
		});
	},

	// 关闭标签弹窗
	bindCloseTagModal: function () {
		this.setData({ tagModalShow: false, selectedTagIds: [] });
	},

	// 切换标签选中
	bindTagSelect: function (e) {
		let id = pageHelper.dataset(e, 'id');
		let selectedTagIds = this.data.selectedTagIds.slice();
		let idx = selectedTagIds.indexOf(id);
		if (idx >= 0) selectedTagIds.splice(idx, 1);
		else selectedTagIds.push(id);

		// 同步标签项的 _checked 标记
		let tagList = this.data.tagList.map(t => {
			return Object.assign({}, t, { _checked: selectedTagIds.indexOf(t.USER_TAG_ID) >= 0 });
		});
		this.setData({ selectedTagIds, tagList });
	},

	// 切换标签模式（add/remove/set）
	bindTagModeChange: function (e) {
		let mode = pageHelper.dataset(e, 'mode');
		this.setData({ tagMode: mode });
	},

	// 确认批量打标签
	bindBatchSetTagsCmpt: async function () {
		if (!this._checkSelected()) return;
		if (this.data.tagMode !== 'set' && this.data.selectedTagIds.length === 0) {
			pageHelper.showModal('请至少选择一个标签');
			return;
		}
		let userIds = this.data.selectedIds;
		let tags = this.data.selectedTagIds;
		let mode = this.data.tagMode;
		try {
			await cloudHelper.callCloudSumbit('admin/user_batch_set_tags', { userIds, tags, mode }, { title: '处理中' });
			this.setData({ tagModalShow: false, selectedTagIds: [] });
			pageHelper.showSuccToast('批量设置标签成功', 1000);
			await this._reloadAfterBatch();
		} catch (err) {
			console.error(err);
		}
	},

	// 打开分组弹窗
	bindOpenGroupModal: async function () {
		if (!this._checkSelected()) return;
		let groupList = this.data.groupList;
		if (!groupList || groupList.length === 0) {
			try {
				groupList = await cloudHelper.callCloudData('admin/user_group_list', {}, { hint: false });
				this.setData({ groupList: groupList || [] });
			} catch (e) {
				console.log(e);
			}
		}
		this.setData({
			groupModalShow: true,
			selectedGroupId: ''
		});
	},

	// 关闭分组弹窗
	bindCloseGroupModal: function () {
		this.setData({ groupModalShow: false, selectedGroupId: '' });
	},

	// 选择分组
	bindGroupSelect: function (e) {
		let id = pageHelper.dataset(e, 'id');
		this.setData({ selectedGroupId: id });
	},

	// 清除分组选择
	bindClearGroupSelect: function () {
		this.setData({ selectedGroupId: '' });
	},

	// 确认批量设置分组
	bindBatchSetGroupCmpt: async function () {
		if (!this._checkSelected()) return;
		if (!this.data.selectedGroupId) {
			pageHelper.showModal('请选择一个分组');
			return;
		}
		let userIds = this.data.selectedIds;
		let groupId = this.data.selectedGroupId;
		try {
			await cloudHelper.callCloudSumbit('admin/user_batch_set_group', { userIds, groupId }, { title: '处理中' });
			this.setData({ groupModalShow: false, selectedGroupId: '' });
			pageHelper.showSuccToast('批量设置分组成功', 1000);
			await this._reloadAfterBatch();
		} catch (err) {
			console.error(err);
		}
	},

	_getSearchMenu: async function () {
		let sortItems1 = [
			{ label: '注册时间', type: '', value: '' },
			{ label: '注册时间从早到晚', type: 'sort', value: 'USER_ADD_TIME|asc' },
			{ label: '注册时间从晚到早', type: 'sort', value: 'USER_ADD_TIME|desc' },
		];
		let sortMenus = [
			{ label: '全部', type: '', value: '' },
			{ label: '正常', type: 'status', value: 1 },
			{ label: '禁用', type: 'status', value: 9 }

		]

		if (projectSetting.USER_REG_CHECK) {
			sortMenus = sortMenus.concat([
				{ label: '待审核', type: 'status', value: 0 },
				{ label: '审核未过', type: 'status', value: 8 }
			]);
		}
		this.setData({
			search: '',
			sortItems: [sortItems1],
			sortMenus,
			isLoad: true
		})


	}

})
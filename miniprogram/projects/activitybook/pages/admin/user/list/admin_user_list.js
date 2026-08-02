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

		// 批量操作相关
		selIds: [], // 已勾选的用户id（USER_MINI_OPENID）
		isSelAll: false, // 是否已全选当前列表

		// 打标签/设分组弹窗相关
		tagModalShow: false, // 打标签弹窗是否显示
		groupModalShow: false, // 设分组弹窗是否显示
		tagPresets: projectSetting.USER_TAG_PRESETS, // 预置标签
		groupPresets: projectSetting.USER_GROUP_PRESETS, // 预置分组
		tagItems: [], // 打标签弹窗中的预置标签勾选状态 [{tag,sel}]
		formCustomTag: '', // 打标签弹窗中输入的自定义标签
		formGroup: null, // 设分组弹窗中选中的分组（null=未选择）
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: async function (options) {
		if (!AdminBiz.isAdmin(this)) return;

		//设置搜索菜单
		await this._getSearchMenu();
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

		// 列表刷新（含搜索/筛选/分页）后清空勾选状态，避免误操作
		if (this.data.selIds.length) this._setSel([]);
	},

	/** 同步勾选状态到列表数据（selIds为已勾选的用户id数组） */
	_setSel: function (selIds) {
		let dataList = this.data.dataList;
		let list = (dataList && dataList.list) ? dataList.list : [];

		// 是否已全选当前已加载的记录
		let isSelAll = list.length > 0 && selIds.length >= list.length;
		for (let k = 0; k < list.length; k++)
			list[k]._sel = selIds.includes(list[k].USER_MINI_OPENID);

		this.setData({ selIds, isSelAll, dataList });
	},

	/** 勾选/取消勾选单个用户 */
	bindSelTap: function (e) {
		let idx = Number(pageHelper.dataset(e, 'idx'));
		let list = this.data.dataList.list;
		let id = list[idx].USER_MINI_OPENID;

		let selIds = this.data.selIds;
		let pos = selIds.indexOf(id);
		if (pos > -1)
			selIds.splice(pos, 1); // 取消勾选
		else
			selIds.push(id); // 勾选

		this._setSel(selIds);
	},

	/** 全选/反选当前列表 */
	bindSelAllTap: function () {
		let dataList = this.data.dataList;
		if (!dataList || !dataList.list || !dataList.list.length) return;

		// 已全选则反选（清空），否则全选当前已加载的记录
		let selIds = this.data.isSelAll ? [] : dataList.list.map(item => item.USER_MINI_OPENID);
		this._setSel(selIds);
	},

	/** 批量操作成功后刷新列表并清空勾选 */
	_reloadList: function () {
		this._setSel([]);
		this.selectComponent('#cmpt-comm-list').reload(); // 刷新列表
	},

	/** 批量删除 */
	bindBatchDelTap: function () {
		if (!AdminBiz.isAdmin(this)) return;
		let ids = this.data.selIds;
		if (!ids.length) return pageHelper.showNoneToast('请先勾选用户');

		let that = this;
		let callback = async () => {
			try {
				let params = { ids };
				let opts = { title: '删除中' };
				await cloudHelper.callCloudSumbit('admin/user_batch_del', params, opts).then(res => {
					pageHelper.showSuccToast('删除成功');
					that._reloadList();
				});
			} catch (e) {
				console.log(e);
			}
		}
		pageHelper.showConfirm('确认删除选中的「' + ids.length + '」个用户？删除不可恢复', callback);
	},

	/** 批量设置状态（启用/禁用） */
	bindBatchStatusTap: function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let status = Number(pageHelper.dataset(e, 'status'));
		let ids = this.data.selIds;
		if (!ids.length) return pageHelper.showNoneToast('请先勾选用户');

		let statusDesc = (status == 1) ? '启用' : '禁用';
		let that = this;
		let callback = async () => {
			try {
				let params = { ids, status };
				await cloudHelper.callCloudSumbit('admin/user_batch_status', params).then(res => {
					pageHelper.showSuccToast('操作成功');
					that._reloadList();
				});
			} catch (e) {
				console.log(e);
			}
		}
		pageHelper.showConfirm('确认将选中的「' + ids.length + '」个用户批量' + statusDesc + '？', callback);
	},

	/** 打开打标签弹窗 */
	bindBatchTagTap: function () {
		if (!AdminBiz.isAdmin(this)) return;
		if (!this.data.selIds.length) return pageHelper.showNoneToast('请先勾选用户');

		// 构造预置标签勾选状态（WXML不支持函数调用，需预置sel标志）
		let tagItems = projectSetting.USER_TAG_PRESETS.map(tag => ({ tag, sel: false }));
		this.setData({
			tagItems,
			formCustomTag: '',
			tagModalShow: true,
		});
	},

	/** 打标签弹窗-勾选/取消勾选预置标签 */
	bindTagItemTap: function (e) {
		let idx = Number(pageHelper.dataset(e, 'idx'));
		let tagItems = this.data.tagItems;
		tagItems[idx].sel = !tagItems[idx].sel;
		this.setData({ tagItems });
	},

	/** 功能点：全局删除标签（确认后调用云端接口，从所有用户身上移除该标签，清理用户数据） */
	bindTagGlobalDelTap: function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let idx = Number(pageHelper.dataset(e, 'idx'));
		let tag = this.data.tagItems[idx].tag;

		let that = this;
		let callback = async () => {
			try {
				let params = { tag };
				let opts = { title: '删除中' };
				await cloudHelper.callCloudSumbit('admin/user_tag_del', params, opts).then(res => {
					pageHelper.showSuccToast('已删除标签，并清理' + (res.data.cnt || 0) + '个用户数据');
					// 从弹窗与会话级预置列表中移除（预置常量定义在 project_setting.js，如需彻底移除请同步修改）
					let tagItems = that.data.tagItems;
					tagItems.splice(idx, 1);
					that.setData({ tagItems });
					that._reloadList(); // 刷新用户列表展示
				});
			} catch (err) {
				console.log(err);
			}
		}
		pageHelper.showConfirm('确认全局删除标签「' + tag + '」？该标签将从所有用户身上移除', callback);
	},

	/** 功能点：全局删除分组（确认后调用云端接口，清空所有该分组用户的分组字段，清理用户数据） */
	bindGroupGlobalDelTap: function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let idx = Number(pageHelper.dataset(e, 'idx'));
		let group = this.data.groupPresets[idx];

		let that = this;
		let callback = async () => {
			try {
				let params = { group };
				let opts = { title: '删除中' };
				await cloudHelper.callCloudSumbit('admin/user_group_del', params, opts).then(res => {
					pageHelper.showSuccToast('已删除分组，并清理' + (res.data.cnt || 0) + '个用户数据');
					// 从弹窗与会话级预置列表中移除（预置常量定义在 project_setting.js，如需彻底移除请同步修改）
					let groupPresets = that.data.groupPresets;
					groupPresets.splice(idx, 1);
					that.setData({ groupPresets });
					that._reloadList(); // 刷新用户列表展示
				});
			} catch (err) {
				console.log(err);
			}
		}
		pageHelper.showConfirm('确认全局删除分组「' + group + '」？属于该分组的用户将被清除分组', callback);
	},

	/** 打标签弹窗-确定（批量设置标签，整体覆盖） */
	bindTagCmpt: async function () {
		if (!AdminBiz.isAdmin(this)) return;
		let ids = this.data.selIds;
		if (!ids.length) return;

		// 合并勾选标签与自定义标签，去空去重
		let tags = this.data.tagItems.filter(item => item.sel).map(item => item.tag);
		let customTag = (this.data.formCustomTag || '').trim();
		if (customTag && !tags.includes(customTag)) tags.push(customTag);
		if (!tags.length) return pageHelper.showNoneToast('请勾选或输入标签');

		try {
			let params = { ids, tags };
			await cloudHelper.callCloudSumbit('admin/user_tag', params).then(res => {
				this.setData({ tagModalShow: false });
				pageHelper.showSuccToast('设置成功');
				this._reloadList();
			});
		} catch (e) {
			console.log(e);
		}
	},

	/** 打开设分组弹窗 */
	bindBatchGroupTap: function () {
		if (!AdminBiz.isAdmin(this)) return;
		if (!this.data.selIds.length) return pageHelper.showNoneToast('请先勾选用户');

		this.setData({
			formGroup: null,
			groupModalShow: true,
		});
	},

	/** 设分组弹窗-单选分组 */
	bindGroupItemTap: function (e) {
		let group = pageHelper.dataset(e, 'group');
		this.setData({ formGroup: group });
	},

	/** 设分组弹窗-确定（批量设置分组） */
	bindGroupCmpt: async function () {
		if (!AdminBiz.isAdmin(this)) return;
		let ids = this.data.selIds;
		if (!ids.length) return;

		// null表示未选择，空字符串表示清除分组
		if (this.data.formGroup === null) return pageHelper.showNoneToast('请选择分组');
		let group = this.data.formGroup;

		try {
			let params = { ids, group };
			await cloudHelper.callCloudSumbit('admin/user_group', params).then(res => {
				this.setData({ groupModalShow: false });
				pageHelper.showSuccToast('设置成功');
				this._reloadList();
			});
		} catch (e) {
			console.log(e);
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

		// 标签筛选下拉（type=tag，云端按标签名匹配USER_TAGS数组）
		let sortItems2 = [{ label: '标签筛选', type: '', value: '' }];
		for (let k = 0; k < projectSetting.USER_TAG_PRESETS.length; k++)
			sortItems2.push({ label: projectSetting.USER_TAG_PRESETS[k], type: 'tag', value: projectSetting.USER_TAG_PRESETS[k] });

		// 分组筛选下拉（type=group，云端按分组名匹配USER_GROUP）
		let sortItems3 = [{ label: '分组筛选', type: '', value: '' }];
		for (let k = 0; k < projectSetting.USER_GROUP_PRESETS.length; k++)
			sortItems3.push({ label: projectSetting.USER_GROUP_PRESETS[k], type: 'group', value: projectSetting.USER_GROUP_PRESETS[k] });

		this.setData({
			search: '',
			sortItems: [sortItems1, sortItems2, sortItems3],
			sortMenus,
			isLoad: true
		})


	}

})
const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const pageHelper = require('../../../../../../helper/page_helper.js');
const cacheHelper = require('../../../../../../helper/cache_helper.js');
const cloudHelper = require('../../../../../../helper/cloud_helper.js');
const helper = require('../../../../../../helper/helper.js');
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
		batchMode: false, // 是否批量选择模式
		selectedIds: [], // 已选中的用户ID

		// 标签编辑弹窗
		tagModalShow: false,
		formTags: '',
		curEditUserId: '',
		curEditIdx: -1,

		// 分组设置弹窗
		groupModalShow: false,
		formGroup: '',

		// 管理员备注弹窗
		remarkModalShow: false,
		formRemark: '',

		// 标签筛选
		tagList: [], // 所有标签列表
		filterTag: '', // 当前筛选的标签
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: async function (options) {
		if (!AdminBiz.isAdmin(this)) return;

		//设置搜索菜单
		await this._getSearchMenu();

		// 加载所有标签用于筛选
		this._loadTagList();
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
		if (helper.isDefined(e.detail.search)) {
			this.setData({
				search: '',
				sortType: '',
			});
		} else {
			let dataList = e.detail.dataList;
			if (dataList && dataList.list) {
				for (let k = 0; k < dataList.list.length; k++) {
					let item = dataList.list[k];
					item.tagArr = item.USER_TAGS || [];
				}
			}
			this.setData({
				dataList,
			});
			if (e.detail.sortType)
				this.setData({
					sortType: e.detail.sortType,
				});
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
		this.setData({
			search: '',
			sortItems: [sortItems1],
			sortMenus,
			isLoad: true
		})


	},

	// ==================== 批量操作 begin ====================

	// 切换批量选择模式
	bindBatchModeTap: function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let batchMode = !this.data.batchMode;
		this.setData({
			batchMode,
			selectedIds: []
		});
	},

	// 单选/取消某条用户
	bindSelectItemTap: function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let id = pageHelper.dataset(e, 'id');
		let selectedIds = this.data.selectedIds.slice();
		let idx = selectedIds.indexOf(id);
		if (idx > -1) {
			selectedIds.splice(idx, 1);
		} else {
			selectedIds.push(id);
		}
		this.setData({ selectedIds });
	},

	// 全选/取消全选（当前页）
	bindSelectAllTap: function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let list = (this.data.dataList && this.data.dataList.list) || [];
		let selectedIds = this.data.selectedIds.slice();
		let allSelected = list.length > 0 && list.every(item => selectedIds.indexOf(item.USER_MINI_OPENID) > -1);
		if (allSelected) {
			let pageIds = list.map(item => item.USER_MINI_OPENID);
			selectedIds = selectedIds.filter(id => pageIds.indexOf(id) == -1);
		} else {
			for (let k = 0; k < list.length; k++) {
				if (selectedIds.indexOf(list[k].USER_MINI_OPENID) == -1) {
					selectedIds.push(list[k].USER_MINI_OPENID);
				}
			}
		}
		this.setData({ selectedIds });
	},

	// 批量启用/禁用
	bindBatchStatusTap: function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let status = Number(pageHelper.dataset(e, 'status'));
		let ids = this.data.selectedIds;
		if (!ids.length) {
			pageHelper.showNoneToast('请先选择记录');
			return;
		}

		let desc = status == 1 ? '启用' : '禁用';
		let callback = async () => {
			try {
				let opts = { title: '处理中' };
				let params = { ids, status };
				await cloudHelper.callCloudSumbit('admin/user_batch_status', params, opts).then(res => {
					this._afterBatch();
					pageHelper.showSuccToast('批量' + desc + '成功');
				});
			} catch (err) {
				console.log(err);
			}
		}
		pageHelper.showConfirm('确认批量' + desc + '选中的' + ids.length + '个用户？', callback);
	},

	// 批量删除
	bindBatchDelTap: function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let ids = this.data.selectedIds;
		if (!ids.length) {
			pageHelper.showNoneToast('请先选择记录');
			return;
		}

		let callback = async () => {
			try {
				let opts = { title: '删除中' };
				let params = { ids };
				await cloudHelper.callCloudSumbit('admin/user_batch_del', params, opts).then(res => {
					this._afterBatch();
					pageHelper.showSuccToast('批量删除成功');
				});
			} catch (err) {
				console.log(err);
			}
		}
		pageHelper.showConfirm('确认批量删除选中的' + ids.length + '个用户？删除不可恢复', callback);
	},

	// 批量操作后统一处理
	_afterBatch: function () {
		this.setData({
			batchMode: false,
			selectedIds: []
		});
		this._loadTagList();
		let listComp = this.selectComponent('#cmpt-comm-list');
		if (listComp) listComp.reload();
	},

	// ==================== 批量操作 end ====================

	// ==================== 标签管理 begin ====================

	// 加载所有标签列表
	_loadTagList: async function () {
		try {
			let opts = { title: '加载中' };
			await cloudHelper.callCloudData('admin/user_tag_list', {}, opts).then(res => {
				let tagList = [];
				if (res && res.length) {
					tagList = res;
				}
				this.setData({ tagList });
			});
		} catch (err) {
			console.log(err);
		}
	},

	// 标签筛选
	bindTagFilterTap: function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let tag = pageHelper.dataset(e, 'tag') || '';
		let filterTag = (this.data.filterTag === tag) ? '' : tag;
		this.setData({ filterTag });
		// 重新加载列表并带上标签筛选条件
		let listComp = this.selectComponent('#cmpt-comm-list');
		if (listComp) {
			listComp.setData({
				_params: { tag: filterTag }
			});
			listComp.reload();
		}
	},

	// 弹出标签编辑弹窗
	bindEditTagsTap: function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let idx = Number(pageHelper.dataset(e, 'idx'));
		let item = this.data.dataList.list[idx];
		this.setData({
			tagModalShow: true,
			formTags: (item.USER_TAGS && item.USER_TAGS.length) ? item.USER_TAGS.join(',') : '',
			curEditUserId: item.USER_MINI_OPENID,
			curEditIdx: idx
		});
	},

	// 清空标签输入
	bindClearTagsTap: function (e) {
		this.setData({ formTags: '' });
	},

	// 确认设置标签
	bindSetTagsCmpt: async function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let id = this.data.curEditUserId;
		let formTags = (this.data.formTags || '').trim();
		if (!id) return;

		let tagArr = formTags ? formTags.split(',').map(t => t.trim()).filter(t => t) : [];

		try {
			let opts = { title: '保存中' };
			let params = { userId: id, tags: tagArr };
			await cloudHelper.callCloudSumbit('admin/user_set_tags', params, opts).then(res => {
				let idx = this.data.curEditIdx;
				this.setData({
					['dataList.list[' + idx + '].USER_TAGS']: tagArr,
					['dataList.list[' + idx + '].tagArr']: tagArr,
					tagModalShow: false,
					formTags: '',
					curEditUserId: '',
					curEditIdx: -1
				});
				pageHelper.showSuccToast('标签设置成功');
				this._loadTagList();
			});
		} catch (err) {
			console.log(err);
		}
	},

	// ==================== 标签管理 end ====================

	// ==================== 分组设置 begin ====================

	// 弹出分组设置弹窗
	bindEditGroupTap: function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let idx = Number(pageHelper.dataset(e, 'idx'));
		let item = this.data.dataList.list[idx];
		this.setData({
			groupModalShow: true,
			formGroup: item.USER_GROUP || '',
			curEditUserId: item.USER_MINI_OPENID,
			curEditIdx: idx
		});
	},

	// 清空分组输入
	bindClearGroupTap: function (e) {
		this.setData({ formGroup: '' });
	},

	// 确认设置分组
	bindSetGroupCmpt: async function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let id = this.data.curEditUserId;
		let group = (this.data.formGroup || '').trim();
		if (!id) return;

		try {
			let opts = { title: '保存中' };
			let params = { userId: id, group };
			await cloudHelper.callCloudSumbit('admin/user_set_group', params, opts).then(res => {
				let idx = this.data.curEditIdx;
				this.setData({
					['dataList.list[' + idx + '].USER_GROUP']: group,
					groupModalShow: false,
					formGroup: '',
					curEditUserId: '',
					curEditIdx: -1
				});
				pageHelper.showSuccToast('分组设置成功');
			});
		} catch (err) {
			console.log(err);
		}
	},

	// ==================== 分组设置 end ====================

	// ==================== 管理员备注 begin ====================

	// 弹出备注编辑弹窗
	bindEditRemarkTap: function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let idx = Number(pageHelper.dataset(e, 'idx'));
		let item = this.data.dataList.list[idx];
		this.setData({
			remarkModalShow: true,
			formRemark: item.USER_MEMO || '',
			curEditUserId: item.USER_MINI_OPENID,
			curEditIdx: idx
		});
	},

	// 清空备注输入
	bindClearRemarkTap: function (e) {
		this.setData({ formRemark: '' });
	},

	// 确认设置备注
	bindSetRemarkCmpt: async function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let id = this.data.curEditUserId;
		let remark = (this.data.formRemark || '').trim();
		if (!id) return;

		try {
			let opts = { title: '保存中' };
			let params = { userId: id, memo: remark };
			await cloudHelper.callCloudSumbit('admin/user_set_memo', params, opts).then(res => {
				let idx = this.data.curEditIdx;
				this.setData({
					['dataList.list[' + idx + '].USER_MEMO']: remark,
					remarkModalShow: false,
					formRemark: '',
					curEditUserId: '',
					curEditIdx: -1
				});
				pageHelper.showSuccToast('备注设置成功');
			});
		} catch (err) {
			console.log(err);
		}
	},

	// ==================== 管理员备注 end ====================

})
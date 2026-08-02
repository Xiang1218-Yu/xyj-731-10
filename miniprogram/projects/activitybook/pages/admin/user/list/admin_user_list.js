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
		batchMode: false,   // 是否进入批量选择模式
		selectedIds: [],    // 已选中的用户openid数组
		tagModalShow: false, // 批量打标签弹窗
		formTag: '',        // 待添加的标签
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

	//############### 批量操作与标签/分组 ###############

	// 切换批量选择模式
	bindToggleBatchTap: function () {
		this.setData({
			batchMode: !this.data.batchMode,
			selectedIds: []
		});
	},

	// 选中/取消选中某个用户
	bindSelectTap: function (e) {
		let id = pageHelper.dataset(e, 'id');
		let selectedIds = this.data.selectedIds;
		let idx = selectedIds.indexOf(id);
		if (idx >= 0)
			selectedIds.splice(idx, 1);
		else
			selectedIds.push(id);
		this.setData({ selectedIds });
	},

	// 全选/取消全选(当前页)
	bindSelectAllTap: function () {
		let list = this.data.dataList ? this.data.dataList.list : [];
		let selectedIds = this.data.selectedIds;
		if (selectedIds.length == list.length && list.length > 0) {
			selectedIds = [];
		} else {
			selectedIds = list.map(item => item.USER_MINI_OPENID);
		}
		this.setData({ selectedIds });
	},

	// 批量删除
	bindBatchDelTap: function () {
		if (!AdminBiz.isAdmin(this)) return;
		if (this.data.selectedIds.length == 0)
			return pageHelper.showNoneToast('请先选择用户');

		let callback = async () => {
			try {
				let opts = { title: '删除中' };
				await cloudHelper.callCloudSumbit('admin/user_batch_del', { ids: this.data.selectedIds }, opts).then(res => {
					this._afterBatch('批量删除成功');
				});
			} catch (e) {
				console.log(e);
			}
		}
		pageHelper.showConfirm('确认删除选中的 ' + this.data.selectedIds.length + ' 个用户？删除不可恢复', callback);
	},

	// 批量修改状态 (data-status)
	bindBatchStatusTap: function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		if (this.data.selectedIds.length == 0)
			return pageHelper.showNoneToast('请先选择用户');

		let status = Number(pageHelper.dataset(e, 'status'));
		let callback = async () => {
			try {
				let opts = { title: '处理中' };
				await cloudHelper.callCloudSumbit('admin/user_batch_status', { ids: this.data.selectedIds, status }, opts).then(res => {
					this._afterBatch('操作成功');
				});
			} catch (e) {
				console.log(e);
			}
		}
		pageHelper.showConfirm('确认对选中的 ' + this.data.selectedIds.length + ' 个用户执行此操作？', callback);
	},

	// 打开批量打标签弹窗
	bindBatchTagTap: function () {
		if (this.data.selectedIds.length == 0)
			return pageHelper.showNoneToast('请先选择用户');
		this.setData({ formTag: '', tagModalShow: true });
	},

	// 确认批量打标签
	bindBatchTagCmpt: async function () {
		let tag = (this.data.formTag || '').trim();
		if (!tag) return pageHelper.showNoneToast('请输入标签');

		try {
			let opts = { title: '处理中' };
			await cloudHelper.callCloudSumbit('admin/user_batch_add_tag', { ids: this.data.selectedIds, tag }, opts).then(res => {
				this.setData({ tagModalShow: false, formTag: '' });
				this._afterBatch('打标签成功');
			});
		} catch (e) {
			console.log(e);
		}
	},

	// 批量操作后刷新列表
	_afterBatch: function (msg) {
		this.setData({
			batchMode: false,
			selectedIds: []
		});
		pageHelper.showSuccToast(msg, 1500, () => {
			let cmpt = this.selectComponent('#cmpt-comm-list');
			if (cmpt) cmpt.reload();
		});
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
			{ label: '禁用', type: 'status', value: 9 },
			{ label: '活跃用户', type: 'tag', value: '活跃用户' },
			{ label: '资深书友', type: 'tag', value: '资深书友' }

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
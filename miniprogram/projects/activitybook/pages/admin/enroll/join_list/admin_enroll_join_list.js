const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const pageHelper = require('../../../../../../helper/page_helper.js'); 
const helper = require('../../../../../../helper/helper.js');
const timeHelper = require('../../../../../../helper/time_helper.js');
const cloudHelper = require('../../../../../../helper/cloud_helper.js'); 

Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false, 

		parentDayIdx: 0,
		parentTimeIdx: 0,

		menuIdx: 0,

		enrollId: '',

		title: '',
		titleEn: '', 
		curIdx: -1,

		startDate: timeHelper.time('Y-M-D', -86400 * 0),
		endDate: timeHelper.time('Y-M-D'),

		// 批量操作
		isBatchMode: false,
		selectedIds: [],
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: function (options) {
		if (!AdminBiz.isAdmin(this)) return;

		// 附加参数 
		if (options && options.enrollId) {


			this.setData({
				enrollId: options.enrollId,
				_params: {
					enrollId: options.enrollId
				}, 
			}, () => {
				this.setData({
					isLoad: true
				});

				this._getSearchMenu();
			}
			);
		}

		if (options && options.title) {
			let title = decodeURIComponent(options.title);
			this.setData({
				title,
				titleEn: options.title
			});
			wx.setNavigationBarTitle({
				title: '打卡记录 - ' + title
			});
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

	url: async function (e) {
		pageHelper.url(e, this);
	}, 

	bindDelTap: async function (e) {

		let callback = async () => {
			let idx = Number(pageHelper.dataset(e, 'idx'));
			let dataList = this.data.dataList;
			let enrollJoinId = dataList.list[idx]._id;
			let params = {
				enrollJoinId
			}
			let opts = {
				title: '删除中'
			}
			try {
				await cloudHelper.callCloudSumbit('admin/enroll_join_del', params, opts).then(res => {

					let cb = () => {
						let dataList = this.data.dataList;
						dataList.list.splice(idx, 1);
						dataList.total--;
						this.setData({
							dataList
						});
					}

					pageHelper.showSuccToast('删除成功', 1000, cb);
				});
			} catch (err) {
				console.error(err);
			}
		}

		pageHelper.showConfirm('确认删除该记录？ 删除后用户将无法查询到本记录', callback);


	},


	bindCommListCmpt: function (e) {

		if (helper.isDefined(e.detail.search))
			this.setData({
				search: '',
				sortType: '',
			});
		else {
			let dataList = e.detail.dataList;
			if (dataList) {
				for (let k = 0; k < dataList.list.length; k++) {
					dataList.list[k].fold = this.data.isAllFold;
					// 同步批量选中状态
					if (this.data.isBatchMode && this.data.selectedIds.length > 0) {
						dataList.list[k]._checked = this.data.selectedIds.indexOf(dataList.list[k]._id) >= 0;
					}
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

	// 修改与展示状态菜单
	_getSearchMenu: function () {

		let sortItems = [];

		let sortMenus = [];

		sortMenus = [
			 
		];

		this.setData({
			sortItems,
			sortMenus
		})


	},

	bindClearReasonTap: function (e) {
		this.setData({
			formReason: ''
		})
	},

	// ==================== 批量操作 ====================

	// 切换批量模式
	bindToggleBatch: function () {
		let isBatchMode = !this.data.isBatchMode;
		this._setSelectedIds([]);
		this.setData({ isBatchMode });
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
		let selectedIds = isAll ? [] : dataList.list.map(item => item._id);
		this._setSelectedIds(selectedIds);
	},

	// 更新选中并同步列表 _checked 标记
	_setSelectedIds: function (selectedIds) {
		let dataList = this.data.dataList;
		if (dataList && dataList.list) {
			for (let k = 0; k < dataList.list.length; k++) {
				dataList.list[k]._checked = selectedIds.indexOf(dataList.list[k]._id) >= 0;
			}
		}
		this.setData({ selectedIds, dataList });
	},

	_checkSelected: function () {
		if (!this.data.selectedIds || this.data.selectedIds.length === 0) {
			pageHelper.showModal('请先选择要操作的记录');
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

	// 批量删除打卡记录
	bindBatchDel: function () {
		if (!this._checkSelected()) return;
		let enrollJoinIds = this.data.selectedIds;
		let callback = async () => {
			try {
				await cloudHelper.callCloudSumbit('admin/enroll_batch_del_join', { enrollJoinIds }, { title: '删除中' });
				pageHelper.showSuccToast('批量删除成功', 1000);
				await this._reloadAfterBatch();
			} catch (err) {
				console.error(err);
			}
		};
		pageHelper.showConfirm(`确认批量删除选中的 ${enrollJoinIds.length} 条打卡记录？删除后不可恢复`, callback);
	}
})
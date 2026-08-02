const pageHelper = require('../../../../../helper/page_helper.js');
const cloudHelper = require('../../../../../helper/cloud_helper.js');
const EnrollBiz = require('../../../biz/enroll_biz.js');
const validate = require('../../../../../helper/validate.js');
const PublicBiz = require('../../../../../comm/biz/public_biz.js');
const ProjectBiz = require('../../../biz/project_biz.js');
const PassportBiz = require('../../../../../comm/biz/passport_biz.js');

// 功能点：语音打卡最长时长（秒）
const VOICE_MAX_SECOND = 60;

Page({

    /**
     * 页面的初始数据
     */
    data: {
        isLoad: false,

        // 功能点：多媒体打卡（语音/位置）
        maxSecond: VOICE_MAX_SECOND, // 语音最长秒数
        voiceRecording: false, // 是否正在录音
        voiceSecond: 0, // 已录音秒数
        voice: null, // 已录语音 {tempFilePath, duration}
        voicePlaying: false, // 语音试听播放状态
        address: '', // 打卡位置文字
        addressGeo: null, // 打卡位置经纬度 {latitude,longitude,name,address}
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: async function (options) {
        ProjectBiz.initPage(this);

        if (!await PassportBiz.loginMustBackWin(this)) return;

        if (!pageHelper.getOptions(this, options)) return;

        this.setData(EnrollBiz.initJoinFormData());
        this.setData({
            isLoad: true
        });

        // 功能点：初始化录音管理器（语音打卡）
        this._initRecorder();
    },


    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady: function () { },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow: function () { },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide: function () { },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function () {
        // 功能点：页面卸载时停止录音与试听，释放资源
        this._voiceDiscard = true;
        this._clearVoiceTimer();
        if (this.data.voiceRecording) this._recorderManager.stop();
        if (this._voiceAudioCtx) {
            this._voiceAudioCtx.destroy();
            this._voiceAudioCtx = null;
        }
    },

    url: function (e) {
        pageHelper.url(e, this);
    },

    // 功能点：初始化录音管理器（语音打卡）
    _initRecorder: function () {
        this._recorderManager = wx.getRecorderManager();

        // 录音结束回调（到达最长时长会自动结束并触发）
        this._recorderManager.onStop((res) => {
            this._clearVoiceTimer();
            if (this._voiceDiscard) return; // 页面已卸载则丢弃结果
            // 时长毫秒转秒，至少1秒
            let duration = Math.max(1, Math.round(res.duration / 1000));
            this.setData({
                voiceRecording: false,
                voice: {
                    tempFilePath: res.tempFilePath,
                    duration
                }
            });
        });

        this._recorderManager.onError((res) => {
            this._clearVoiceTimer();
            if (this._voiceDiscard) return;
            this.setData({ voiceRecording: false });
            pageHelper.showNoneToast('录音失败，请检查录音权限后重试');
            console.error('recorder error', res);
        });
    },

    // 功能点：录音秒数计时
    _startVoiceTimer: function () {
        this._clearVoiceTimer();
        this._voiceTimer = setInterval(() => {
            let voiceSecond = this.data.voiceSecond + 1;
            if (voiceSecond >= VOICE_MAX_SECOND) voiceSecond = VOICE_MAX_SECOND;
            this.setData({ voiceSecond });
        }, 1000);
    },

    _clearVoiceTimer: function () {
        if (this._voiceTimer) {
            clearInterval(this._voiceTimer);
            this._voiceTimer = null;
        }
    },

    // 功能点：开始/结束录音（语音打卡，最长60秒）
    bindVoiceToggleTap: function () {
        if (this.data.voiceRecording) {
            this._recorderManager.stop();
            return;
        }

        this.setData({
            voiceRecording: true,
            voiceSecond: 0,
            voice: null // 重新录音则覆盖旧语音
        });
        this._startVoiceTimer();

        this._recorderManager.start({
            duration: VOICE_MAX_SECOND * 1000, // 最长时长，到点自动触发onStop
            sampleRate: 16000,
            numberOfChannels: 1,
            encodeBitRate: 96000,
            format: 'mp3'
        });
    },

    // 功能点：删除已录语音
    bindVoiceDelTap: function () {
        this._stopVoicePlay();
        this.setData({ voice: null });
    },

    // 功能点：试听已录语音（播放/暂停）
    bindVoicePlayTap: function () {
        if (!this.data.voice || !this.data.voice.tempFilePath) return;

        if (this.data.voicePlaying) {
            this._stopVoicePlay();
            return;
        }

        if (!this._voiceAudioCtx) {
            this._voiceAudioCtx = wx.createInnerAudioContext();
            this._voiceAudioCtx.onEnded(() => this._stopVoicePlay());
            this._voiceAudioCtx.onError(() => this._stopVoicePlay());
        }
        this._voiceAudioCtx.src = this.data.voice.tempFilePath;
        this._voiceAudioCtx.play();
        this.setData({ voicePlaying: true });
    },

    _stopVoicePlay: function () {
        if (this._voiceAudioCtx) this._voiceAudioCtx.stop();
        this.setData({ voicePlaying: false });
    },

    // 功能点：获取打卡位置（wx.chooseLocation，需scope.userLocation授权）
    bindChooseLocationTap: function () {
        wx.chooseLocation({
            success: (res) => {
                if (!res || !res.address) return;
                // 位置文字 = 详细地址 + POI名称
                let address = res.address + (res.name ? ' ' + res.name : '');
                this.setData({
                    address,
                    addressGeo: {
                        latitude: res.latitude,
                        longitude: res.longitude,
                        name: res.name || '',
                        address: res.address || ''
                    }
                });
            },
            fail: (err) => {
                console.log('chooseLocation fail', err);
            }
        });
    },

    // 功能点：清除打卡位置
    bindLocationDelTap: function () {
        this.setData({
            address: '',
            addressGeo: null
        });
    },


    bindFormSubmit: async function () {

        // 功能点：录音中禁止提交
        if (this.data.voiceRecording)
            return pageHelper.showNoneToast('正在录音中，请先结束录音');

        let data = this.data;
        data = validate.check(data, EnrollBiz.CHECK_JOIN_FORM, this);
        if (!data) return;


        let forms = this.selectComponent("#cmpt-form").getForms(true);
        if (!forms) return;
        data.forms = forms;
        data.enrollId = this.data.id;

        // 功能点：语音打卡 —— 提交前先将语音文件上传至云存储
        let voice = {};
        if (this.data.voice && this.data.voice.tempFilePath) {
            let arr = await cloudHelper.transTempPics([this.data.voice.tempFilePath], 'enroll/join/', '', 'voice');
            if (!arr || !arr.length || !arr[0])
                return pageHelper.showNoneToast('语音上传失败，请重试');
            voice = {
                fileID: arr[0], // 云存储fileID
                duration: this.data.voice.duration // 语音时长（秒）
            };
        }
        data.voice = voice;

        // 功能点：位置打卡 —— 位置文字 + 经纬度
        data.address = this.data.address || '';
        data.addressGeo = this.data.addressGeo || {};

        try {

            // 创建
            let result = await cloudHelper.callCloudSumbit('enroll/join', data);
            let enrollJoinId = result.data.enrollJoinId;

            // 图片
            await cloudHelper.transFormsTempPics(forms, 'enroll/join/', enrollJoinId, 'enroll/update_join_forms');

            let callback = async function () {
                PublicBiz.removeCacheList('admin-enroll-join-list');
                PublicBiz.removeCacheList('enroll-join-list');

                let parent = pageHelper.getPrevPage(2);
                if (parent) {
                    parent._loadDetail();
                }
                wx.navigateBack();

            }
            pageHelper.showSuccToast('打卡成功', 2000, callback);

        } catch (err) {
            console.log(err);
            // 功能点：打卡失败时清理已上传的语音云文件，避免产生垃圾文件
            if (voice.fileID)
                wx.cloud.deleteFile({ fileList: [voice.fileID] }).catch(e => console.error(e));
        }
    },


})

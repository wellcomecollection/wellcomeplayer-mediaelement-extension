/// <reference path="../../js/jquery.d.ts" />
/// <reference path="../../js/extensions.d.ts" />

import baseApp = require("../../modules/coreplayer-shared-module/baseApp");
import coreApp = require("../coreplayer-mediaelement-extension/app");
import utils = require("../../utils");
import baseProvider = require("../../modules/coreplayer-shared-module/baseProvider");
import provider = require("./provider");
import shell = require("../../modules/coreplayer-shared-module/shell");
import header = require("../../modules/coreplayer-shared-module/headerPanel");
import right = require("../../modules/wellcomeplayer-moreinforightpanel-module/moreInfoRightPanel");
import footer = require("../../modules/coreplayer-extendedfooterpanel-module/extendedFooterPanel");
import login = require("../../modules/wellcomeplayer-dialogues-module/loginDialogue");
import conditions = require("../../modules/wellcomeplayer-dialogues-module/conditionsDialogue");
import download = require("../../modules/wellcomeplayer-dialogues-module/downloadDialogue");
import center = require("../../modules/coreplayer-mediaelementcenterpanel-module/mediaelementCenterPanel");
import embed = require("../../extensions/coreplayer-mediaelement-extension/embedDialogue");
import help = require("../../modules/coreplayer-dialogues-module/helpDialogue");

export class App extends coreApp.App {

    $conditionsDialogue: JQuery;
    conditionsDialogue: conditions.ConditionsDialogue;
    $loginDialogue: JQuery;
    loginDialogue: login.LoginDialogue;
    $downloadDialogue: JQuery;
    downloadDialogue: download.DownloadDialogue;
    $helpDialogue: JQuery;
    helpDialogue: help.HelpDialogue;

    sessionTimer: any;

    static WINDOW_UNLOAD: string = 'onWindowUnload';
    static ESCAPE: string = 'onEscape';
    static RETURN: string = 'onReturn';
    static TRACK_EVENT: string = 'onTrackEvent';
    static CLOSE_ACTIVE_DIALOGUE: string = 'onCloseActiveDialogue';
    static SAVE: string = 'onSave';
    static CREATED: string = 'onCreated';

    constructor(provider: provider.Provider) {
        super(provider);
    }

    create(): void {
        super.create();

        // keyboard events.
        $(document).keyup((e) => {
            if (e.keyCode === 27) $.publish(App.ESCAPE);
            if (e.keyCode === 13) $.publish(App.RETURN);
        });

        $.subscribe(App.ESCAPE, () => {
            if (this.isFullScreen) {
                $.publish(baseApp.BaseApp.TOGGLE_FULLSCREEN);
            }
        });

        // track unload
        $(window).bind('unload', () => {
            this.trackAction("Documents", "Unloaded");
            $.publish(App.WINDOW_UNLOAD);
        });

        $.subscribe(footer.ExtendedFooterPanel.SAVE, (e) => {
            this.save();
        });

        $.subscribe(login.LoginDialogue.LOGIN, (e, params: any) => {
            this.login(params);
        });

        // publish created event
        $.publish(App.CREATED);
    }

    createModules(): void{
        this.headerPanel = new header.HeaderPanel(shell.Shell.$headerPanel);

        this.centerPanel = new center.MediaElementCenterPanel(shell.Shell.$centerPanel);
        this.rightPanel = new right.MoreInfoRightPanel(shell.Shell.$rightPanel);
        this.footerPanel = new footer.ExtendedFooterPanel(shell.Shell.$footerPanel);

        this.$conditionsDialogue = utils.Utils.createDiv('overlay conditions');
        shell.Shell.$overlays.append(this.$conditionsDialogue);
        this.conditionsDialogue = new conditions.ConditionsDialogue(this.$conditionsDialogue);

        this.$loginDialogue = utils.Utils.createDiv('overlay login');
        shell.Shell.$overlays.append(this.$loginDialogue);
        this.loginDialogue = new login.LoginDialogue(this.$loginDialogue);

        this.$embedDialogue = utils.Utils.createDiv('overlay embed');
        shell.Shell.$overlays.append(this.$embedDialogue);
        this.embedDialogue = new embed.EmbedDialogue(this.$embedDialogue);

        this.$downloadDialogue = utils.Utils.createDiv('overlay download');
        shell.Shell.$overlays.append(this.$downloadDialogue);
        this.downloadDialogue = new download.DownloadDialogue(this.$downloadDialogue);

        this.$helpDialogue = utils.Utils.createDiv('overlay help');
        shell.Shell.$overlays.append(this.$helpDialogue);
        this.helpDialogue = new help.HelpDialogue(this.$helpDialogue);
    }

    viewMedia(){

        var assetIndex = 0;

        this.prefetchAsset(assetIndex, () => {

            // successfully prefetched.

            var asset = this.provider.assetSequence.assets[assetIndex];

            $.publish(App.OPEN_MEDIA, [asset.fileUri]);

            this.setParam(baseProvider.params.assetIndex, assetIndex);

            // todo: add this to more general trackEvent
            this.updateSlidingExpiration();
        });
    }

    save(): void {

        if (!this.isLoggedIn()) {
            this.showLoginDialogue({
                successCallback: () => {
                    this.save();
                },
                failureCallback: (message: string) => {
                    this.showDialogue(message);
                },
                allowClose: true,
                message: this.provider.config.modules.genericDialogue.content.loginToSave
            });
        } else {
            var path = (<provider.Provider>this.provider).getSaveUrl();
            var title = this.provider.getTitle();
            var asset = this.getCurrentAsset();

            var info = (<provider.Provider>this.provider).getSaveInfo(path, title, this.currentAssetIndex);
            this.triggerSocket(App.SAVE, info);
        }
    }

    // everything from here down is common to wellcome-seadragon-extension.
    // need to implement a composition-based approach for code reuse.

    setParams(): void{
        // check if there are legacy params and reformat.
        // if the string isn't empty and doesn't contain a ? sign it's a legacy hash.
        var hash = parent.document.location.hash;

        if (hash != '' && !hash.contains('?')){
            // split params on '/'.
            var params = hash.replace('#', '').split('/');

            // reset hash to empty.
            parent.document.location.hash = '';

            // assetSequenceIndex
            if (params[0]){
                this.setParam(baseProvider.params.assetSequenceIndex, this.provider.assetSequenceIndex);
            }

            // assetIndex
            if (params[1]){
                this.setParam(baseProvider.params.assetIndex, params[1]);
            }

            // zoom or search
            if (params[2]){
                
                if (params[2].indexOf('=') != -1){
                    // it's a search param.
                    var a = params[2].split('=');

                    utils.Utils.setHashParameter(a[0], a[1], parent.document);
                } else {
                    this.setParam(baseProvider.params.zoom, params[2]);
                }
            }

            // search
            if (params[3]){
                var s = params[3];

                // split into key/val.
                var a = s.split('=');

                utils.Utils.setHashParameter(a[0], a[1], parent.document);
            }
        } else {
            // set assetSequenceIndex hash param.
            this.setParam(baseProvider.params.assetSequenceIndex, this.provider.assetSequenceIndex);
        }
    }

    // ensures that a file is in the server cache.
    prefetchAsset(assetIndex: number, successCallback: any): void{
        var asset = this.getAssetByIndex(assetIndex);

        var prefetchUri = (<provider.Provider>this.provider).getPrefetchUri(asset);

        $.getJSON(prefetchUri, function (result) {
            if (result.Success) {
                successCallback(asset.fileUri);
            } else {
                console.log(result.Message);
            }
        });
    }

    login(params: any) {
        var ajaxOptions = {
            url: (<provider.Provider>this.provider).getLoginUri(params.username, params.password),
            type: "GET",
            dataType: "json",
            xhrFields: { withCredentials: true },
            // success callback
            success: (result: any) => {
                
                $.publish(login.LoginDialogue.HIDE_LOGIN_DIALOGUE);

                if (result.Message.toLowerCase() == "success") {
                    this.triggerSocket(login.LoginDialogue.LOGIN, result.DisplayNameBase64);
                    params.successCallback(true);
                } else {
                    params.failureCallback(result.Message, true);
                }
            },
            // error callback
            error: (result: any) => {
                 $.publish(login.LoginDialogue.HIDE_LOGIN_DIALOGUE);

                params.failureCallback(this.provider.config.modules.genericDialogue.content.error, true);
            }
        };

        $.ajax(ajaxOptions);
    }

    showLoginDialogue(params): void {
        // this needs to be postponed otherwise
        // it will trigger before the login event
        // handler is registered.
        setTimeout(() => {
            $.publish(login.LoginDialogue.SHOW_LOGIN_DIALOGUE, [params]);
        }, 1);
    }

    isLoggedIn(): boolean {
        return document.cookie.indexOf("wlauth") >= 0;
    }

    hasPermissionToViewCurrentItem(): boolean{
        return this.isAuthorised(this.currentAssetIndex);
    }

    isAuthorised(assetIndex): boolean {

        var section = this.getSectionByAssetIndex(assetIndex);

        if (section.extensions.authStatus.toLowerCase() == "allowed") {
            return true;
        }

        return false;
    }

    allowCloseLogin(): boolean {

        // if there's only one asset in the package, you must login to see anything,
        // so don't allow it to be closed.
        // necessary for video/audio which have no ui to trigger
        // new login event.
        return this.provider.assetSequence.assets.length != 1;
    }

    updateSlidingExpiration(): void {

        // not necessary if content is all open.
        if (this.provider.pkg.extensions.isAllOpen) return;

        // some (or all) of the content requires login.
        // if the user has a session, update the sliding expiration.
        if (!this.isLoggedIn()) return;

        var that = this;

        // get ttl.
        $.ajax({
            url: '/service/ttl',
            type: 'GET',
            success: (time) => {
                time = parseInt(time);

                // don't create a session timer if the session has expired.
                if (time == -1) return;

                var ms = time * 1000;

                if (that.sessionTimer) {
                    clearTimeout(that.sessionTimer);
                }

                that.sessionTimer = setTimeout(function () {
                    that.closeActiveDialogue();
                    that.showDialogue(that.provider.config.modules.genericDialogue.content.sessionExpired, () => {
                        that.refresh();
                    }, that.provider.config.modules.genericDialogue.content.refresh, false);
                }, ms);
            }
        });
    }

    closeActiveDialogue(): void{
        $.publish(App.CLOSE_ACTIVE_DIALOGUE);
    }

    trackAction(category, action) {

        var label = this.getTrackActionLabel();

        //log(category, action, label);

        // update sliding session expiration.
        this.updateSlidingExpiration();

        try {
            trackEvent(category, action, label);
        } catch (e) {
            // do nothing
        }
    }

    getTrackActionLabel() {
        return      "bNumber: " + this.provider.pkg.identifier 
                + ", type: " + this.provider.type 
                + ", assetSequenceIndex: " + this.provider.assetSequenceIndex
                + ", asset: " + this.currentAssetIndex 
                + ", isLoggedIn: " + this.isLoggedIn() 
                + ", isHomeDomain: " + this.provider.isHomeDomain 
                + ", uri: " + window.parent.location;
    }

    isSaveToLightboxEnabled(): boolean {

        if (this.provider.config.options.saveToLightboxEnabled == false) return false;
        if (!this.provider.isHomeDomain) return false;
        if (!this.provider.isOnlyInstance) return false;

        return true;
    }
}

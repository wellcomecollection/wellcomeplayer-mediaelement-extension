/// <reference path="../../js/jquery.d.ts" />
/// <reference path="../../js/extensions.d.ts" />
import coreProvider = require("../coreplayer-mediaelement-extension/provider");
import utils = require("../../utils");

export class Provider extends coreProvider.Provider {

    constructor(config: any, pkg: any) {
        super(config, pkg);

        $.extend(true, this.config.options, {
            moreInfoUriTemplate: '{0}{1}',
            prefetchUriTemplate: '{0}/fc/{1}/{2}?callback=?',
            assetsUriTemplate: '{0}{1}',
            loginUriTemplate: '{0}/service/login?username={1}&password={2}&setCookies=true&t={3}',
            pdfUriTemplate: '{0}/pdf/{1}/{2}/{3}_{2}.pdf',
            isSecureLogin: false
        });
    }

    getMoreInfoUri(): string{
        var baseUri = this.options.dataBaseUri || "";
        var uri = baseUri + this.pkg.bibliographicInformation;

        if (this.options.timestampUris) uri = this.addTimestamp(uri);

        return uri;
    }

    getPrefetchUri(asset: any): string{
        var baseUri = this.config.options.prefetchBaseUri || this.config.options.dataBaseUri || "";
        var fileExtension = asset.fileUri.substr(asset.fileUri.indexOf('.') + 1);
        return String.prototype.format(this.config.options.prefetchUriTemplate, baseUri, asset.identifier, fileExtension);
    }

    getAssetUri(asset: any): string {
        var baseUri = this.config.options.assetsBaseUri || this.config.options.dataBaseUri || "";
        return String.prototype.format(this.config.options.assetsUriTemplate, baseUri, asset.fileUri);
    }

    getLoginUri(username: string, password: string) {
        var baseUri = this.config.options.loginBaseUri || this.config.options.dataBaseUri || "";
        var uri = String.prototype.format(this.config.options.loginUriTemplate, baseUri, username, password, utils.Utils.getTimeStamp());
        if (this.config.options.isSecureLogin) uri = uri.replace("http:", "https:");
        return uri;
    }

    getSaveUrl(): string {
        var absUri = parent.document.URL;
        var parts = utils.Utils.getUrlParts(absUri);
        var relUri = parts.pathname + parent.document.location.hash;

        if (!relUri.startsWith("/")) {
            relUri = "/" + relUri;
        }

        return relUri;
    }

    // this is different from the seadragon provider - all above is same, but with parts removed.

    getSaveInfo(path, thumbnail, title) {
        return {
            "CaptureType": "v",
            "Path": path,
            "Thumbnail": thumbnail,
            "Title": title
        };
    }
}

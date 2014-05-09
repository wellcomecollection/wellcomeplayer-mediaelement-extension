
import IWellcomeProvider = require("../../modules/wellcomeplayer-shared-module/iWellcomeProvider");
import IMediaElementProvider = require("../coreplayer-mediaelement-extension/iMediaElementProvider");

interface IWellcomeMediaElementProvider extends IWellcomeProvider, IMediaElementProvider{
	getSaveInfo(path: string, thumbnail: string, title: string): any;
	getThumbUri(): string;
}

export = IWellcomeMediaElementProvider;
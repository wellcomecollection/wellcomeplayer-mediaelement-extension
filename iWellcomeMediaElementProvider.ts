
import IMediaElementProvider = require("../coreplayer-mediaelement-extension/iMediaElementProvider");

interface IWellcomeMediaElementProvider extends IMediaElementProvider{
	getSaveInfo(path: string, thumbnail: string, title: string): any;
	getThumbUri(): string;
}

export = IWellcomeMediaElementProvider;
import JSZip from 'jszip';
import { THEME_COLORS } from './tokens.mjs';

const SLOTS = ['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'];

/** pptxgenjs writes Office's palette into the theme. Write Cadence's instead, so editors see it in their color picker. */
function theme(xml, name) {
	const scheme = `<a:clrScheme name="${name}">${SLOTS.map((k) => `<a:${k}><a:srgbClr val="${THEME_COLORS[k]}"/></a:${k}>`).join('')}</a:clrScheme>`;
	const out = xml.replace(/<a:clrScheme\b[\s\S]*?<\/a:clrScheme>/, () => scheme).replace(/(<a:(?:theme|fontScheme)\b[^>]*?\bname=")[^"]*"/g, (_, head) => `${head}${name}"`);
	if (!out.includes(scheme)) throw new Error('theme1.xml has no <a:clrScheme> to replace');
	return out;
}

/** Pictures named "shot:<radius>:<file>" get rounded corners, sized from their own extents. */
function roundShots(xml) {
	return xml.replace(/<p:pic>[\s\S]*?<\/p:pic>/g, (pic) => {
		const name = pic.match(/<p:cNvPr [^>]*name="shot:([\d.]+):[^"]*"/);
		if (!name) return pic;
		const ext = pic.match(/<a:ext cx="(\d+)" cy="(\d+)"\/>/);
		const radiusEmu = Number(name[1]) * 914400;
		const adj = Math.round((radiusEmu * 100000) / Math.min(Number(ext[1]), Number(ext[2])));
		return pic.replace('<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>', `<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val ${adj}"/></a:avLst></a:prstGeom>`);
	});
}

/** Shapes named "arc:round" get round line caps, like the app icon's ring. */
function roundCaps(xml) {
	return xml.replace(/<p:sp>[\s\S]*?<\/p:sp>/g, (sp) => (sp.includes('name="arc:round"') ? sp.replace(/<a:ln (?![^>]*cap=)/, '<a:ln cap="rnd" ') : sp));
}

export async function finish(buffer, { themeName }) {
	const zip = await JSZip.loadAsync(buffer, { createFolders: false });
	const flat = { createFolders: false };
	const themePath = 'ppt/theme/theme1.xml';
	zip.file(themePath, theme(await zip.file(themePath).async('string'), themeName), flat);
	for (const path of Object.keys(zip.files).filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))) {
		const xml = await zip.file(path).async('string');
		zip.file(path, roundCaps(roundShots(xml)), flat);
	}
	// pptxgenjs writes folder entries into the ZIP, and cloud editors can fail to open a package that has them.
	const out = new JSZip();
	for (const [path, file] of Object.entries(zip.files)) if (!file.dir) out.file(path, await file.async('uint8array'), flat);
	return out.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

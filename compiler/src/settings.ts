/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>.


*/

import * as yup from "yup";
import type { CompilerConst } from "./types.js";




export interface Settings {
	name: string;
	authors: string[];
	filename: string;
	compilerOptions: {
		/**A list of stdlib files that should be included in a project's compiled output. */
		include: string[];
		/**Whether or not to remove comments. Also removes trailing whitespace/tabs. May not work. */
		removeComments: boolean;
		/**Whether to compile anyway if errors are found. Currently a bit broken. */
		compileWithErrors: boolean;
		/**Whether to compile as a project or a collection of standalone files. */
		mode: "project" | "single";
		/**If enabled, prepends the file name to all args starting with two underscores. */
		prependFileName: boolean;
		/**Enables type checking. */
		checkTypes: boolean;
		/**Displays extra information. */
		verbose: boolean;
		/**Removes unused jump labels from compiled output. Useful if you use jump labels as labels. */
		removeUnusedJumpLabels: boolean;
		/**Please don't remove the compiler mark... */
		removeCompilerMark: boolean;
	};
	compilerConstants: {
		[index: string]: CompilerConst;
	}
}

export const settingsSchema = yup.object({
	name: yup.string().default("Untitled Project"),
	authors: yup.array().of(yup.string()).default(["Unknown"]),
	filename: yup.string().default("unknown.mlogx"),
	compilerOptions: yup.object({
		include: yup.array().of(yup.string()).default([]),
		verbose: yup.bool().default(false),
		removeComments: yup.bool().default(true),
		compileWithErrors: yup.bool().default(true),
		mode: yup.string().oneOf(["project", "single"]),
		prependFileName: yup.bool().default(true),
		checkTypes: yup.bool().default(true),
		removeUnusedJumpLabels: yup.bool().default(true),
		removeCompilerMark: yup.bool().default(false),
	}).required(),
	compilerConstants: yup.object().default({})
}).required();
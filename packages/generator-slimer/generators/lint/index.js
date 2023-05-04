'use strict';
const Generator = require('../../lib/Generator');

const knownOptions = {
    type: {
        type: String,
        required: true,
        desc: 'What kind of project to create: [module, app, pkg, mono]'
    },
    typescript: {
        type: Boolean,
        desc: 'Create a TypeScript module?'
    }
};
const knownArguments = {};

module.exports = class extends Generator {
    constructor(args, options) {
        super(args, options, knownArguments, knownOptions);
    }

    initializing() {
        super.initializing();
    }

    configuring() {
        // Don't lint top-level of mono repos
        if (this.props.type !== 'mono') {
            // Add .eslintrc.js file (can be extended)
            this.fs.copyTpl(
                this.templatePath('.eslintrc.js'),
                this.destinationPath('.eslintrc.js'),
                {isTypescript: this.props.typescript}
            );

            if (!this.props.skipTest) {
                // Add test/.eslintrc.js file (can be extended)
                this.fs.copyTpl(
                    this.templatePath('test/.eslintrc.js'),
                    this.destinationPath('test/.eslintrc.js'),
                    {isTypescript: this.props.typescript}
                );
            }
        }
    }

    // We use default, so that writing can be used to add more scripts after this
    default() {
        const extension = this.props.typescript ? 'ts' : 'js';

        const lintCodeScript = this.props.typescript
            ? `eslint src/ --ext .ts --cache`
            : `eslint *.${extension} lib/ --ext .${extension} --cache`;

        // "lint:test": "eslint -c test/.eslintrc.js test/ --ext .js --cache",
        const lintTestScript = `eslint -c test/.eslintrc.js test/ --ext .${extension} --cache`;

        //  "lint": "lerna run lint",
        const monoLintScript = 'lerna run lint';

        const destination = this.fs.readJSON(this.destinationPath('package.json'));
        if (destination) {
            // Add lint script to package.json
            if (this.props.type === 'mono') {
                destination.scripts.lint = monoLintScript;
            } else {
                destination.scripts['lint:code'] = lintCodeScript;
                destination.scripts.lint = 'yarn lint:code';
            }

            // Add posttest, but not for packages/mono repos, or repos without tests
            if (['mono', 'pkg'].includes(this.props.type) && !this.props.skipTest && destination.scripts.test) {
                destination.scripts['lint:test'] = lintTestScript;
                destination.scripts.lint += ' && yarn lint:test';
            }
            this.fs.writeJSON(this.destinationPath('package.json'), destination);
        }
    }

    install() {
        let options = {dev: true, exact: true};
        if (this.props.type === 'mono') {
            options['ignore-workspace-root-check'] = true;
        }

        // We don't need these dependencies if we're a mono repo package
        if (this.props.type !== 'pkg') {
            // Basic lint dependencies
            this.yarnInstall(['eslint', 'eslint-plugin-ghost'], options);
        }
    }
};

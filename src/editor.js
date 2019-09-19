/**
 * Copyright 2019 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import './editor.css';
import {ampStoryAutoAdsRE, storyAdsConfig} from './story-ad-config';
import {appliedState, batchedApplier} from './utils/applied-state';
import {assert} from '../lib/assert';
import {
  ChooseTemplatesButton,
  fetchTemplateContentFactory,
  parseTemplatesJsonScript,
  templateFileUrl,
  TemplatesJsonScriptOptional,
  TemplatesPanel,
} from './template-loader';
import {
  concatAttachBlobUrl,
  FilesDragHint,
  FilesPanel,
  FileUploadButton,
  readableFileUrl,
  removeUploadedFile,
  replaceFileRefs,
} from './file-upload';
import {CTA_TYPES} from './cta-types';
import {Deferred} from '../vendor/ampproject/amphtml/src/utils/promise';
import {ExportButton, ExportModal, VideoDownloadWarning} from './export';
import {getNamespace} from '../lib/namespace';
import {hintsUrl, setAttrFileHints} from './hints';
import {html, render} from 'lit-html';
import {idleSuccessfulFetch} from './utils/xhr';
import {listenAllBound, redispatchAs} from './utils/events';
import {readFileString, readFixtureHtml} from './static-data';
import {RefreshIcon} from './icons';
import {save} from './save';
import {ToggleButton} from './toggle-button';
import {ToggleInnerOuterContentButton} from './toggle-inner-outer';
import {Toolbar} from './toolbar';
import {until} from 'lit-html/directives/until';
import {untilAttached} from './utils/until-attached';
import {
  validViewportId,
  Viewport,
  viewportIdDefault,
  viewportIdFull,
  ViewportSelector,
} from './viewport';
import {WrappedCodemirror} from './wrapped-codemirror';
import AmpStoryAdPreview from './amp-story-ad-preview';
import JSZip from 'jszip';

const {id, g, n, s} = getNamespace('editor');

/** @return {Promise<{content: string}>} */
const staticServerData = async () => ({
  content: await readFixtureHtml('ad'),
  // Since this is a template that is never user-edited, let's minify it to
  // keep the bundle small.
  storyDocTemplate: await readFixtureHtml('story'),
  templatesJson: await readFileString('dist/templates.json'),
});

/**
 * Renders Live Editor.
 * @param {Object} data
 *    All properties optional, see each one for defaults and exclusion effects.
 * @param {Promise<Element>=} data.codeMirrorElement
 *    Promise to include editor content element once rendered by codemirror.
 *    Defaults to `Textarea({content})` for server-side rendering,
 *    which is a single-use element to populate codemirror.
 * @param {string=} data.content = ''
 *    Passed on for server-side rendering.
 *    Omitting this before populating will simply result in codemirror not
 *    having any content.
 *    If already populated, omitting this has no effect for codemirror.
 * @param {boolean=} data.isFilesDragHintDisplayed = false
 * @param {boolean=} data.isFilesPanelDisplayed = false
 * @param {boolean=} data.isFullPreview = false
 * @param {Element=} data.previewElement
 *    Preview element to include inside the viewport.
 *    Defaults to an `EmptyPreview({storyDocTemplate})` element, for
 *    server-side rendering.
 *    (The SSR'd element is taken on runtime to manipulate independently, we
 *    bookkeep it so that it won't be overriden by the client-side rerender.)
 * @param {string=} data.storyDocTemplate
 * @param {Object<string, {previewExt: string, files: Array}>} data.templates
 *    Templates definition.
 *    Displayed inside the `TemplatePanel`.
 * @param {string} data.templatesJson
 *    A definition of the above serialized as JSON.
 *    Used for inserting template definition by SSR. On the client, parsed
 *    value is passed as `templates`.
 * @param {string=} data.viewportId = viewportIdDefault
 *    Viewport id as defined by the `viewports` object in `./viewport.js`.
 *    Defaults to exported `./viewport.viewportIdDefault`.
 * @return {lit-html/TemplateResult}
 */
const renderEditor = ({
  // Keep alphabetically sorted.
  // Or don't. I'm a sign, not a cop. https://git.io/fj2tc
  codeMirrorElement,
  content = '',
  files = [],
  isDownloading = false,
  isEditingInner = true,
  isExporting = false,
  isFilesDragHintDisplayed = false,
  isFilesPanelDisplayed = false,
  isFullPreview = false,
  isTemplatePanelDisplayed = false,
  previewElement,
  showVideoWarning = false,
  storyDocTemplate = '',
  templates,
  templatesJson,
  viewportId = viewportIdDefault,
}) => html`
  <div id=${id} class=${n('wrap')}>
    ${FilesPanel({
      files,
      isDisplayed: !isFullPreview && isFilesPanelDisplayed,
    })}
    ${ContentPanel({
      isDisplayed: !isFullPreview,
      isFilesDragHintDisplayed,
      isFilesPanelDisplayed,
      isTemplatePanelDisplayed,
      codeMirrorElement,
      content,
      templates,
      isEditingInner,
    })}
    ${PreviewPanel({
      isFullPreview,
      previewElement,
      storyDocTemplate,
      viewportId,
    })}
    ${ExportModal({isExporting, isDownloading})}
    ${TemplatesJsonScriptOptional(templatesJson)}
    ${showVideoWarning ? VideoDownloadWarning() : ''}
  </div>
`;

/**
 * @param {Object} data
 * @param {Promise<Element>=} data.codeMirrorElement
 * @param {string=} data.content
 * @param {boolean} data.isDisplayed
 * @param {boolean} data.isFilesDragHintDisplayed
 * @param {boolean} data.isFilesPanelDisplayed
 * @return {lit-html/TemplateResult}
 */
const ContentPanel = ({
  codeMirrorElement,
  content,
  isDisplayed,
  isFilesDragHintDisplayed,
  isFilesPanelDisplayed,
  isTemplatePanelDisplayed,
  templates,
  isEditingInner,
}) => html`
  <div class=${n('content')} ?hidden=${!isDisplayed}>
    ${FilesDragHint({isDisplayed: isFilesDragHintDisplayed})}
    ${ContentToolbar({
      isFilesPanelDisplayed,
      isTemplatePanelDisplayed,
      isEditingInner,
    })}
    ${TemplatesPanel({isDisplayed: isTemplatePanelDisplayed, templates})}
    <!--
      Default Content to load on the server and then populate codemirror on
      the client.
      codeMirrorElement is a promise resolved by codemirror(), hence the
      until directive. Once resolved, content can be empty.
    -->
    ${until(codeMirrorElement || Textarea({content}))}
  </div>
`;

/**
 * Renders content panel toolbar.
 * @param {Object} data
 * @param {boolean=} data.isFilesPanelDisplayed
 * @return {lit-html/TemplateResult}
 */
const ContentToolbar = ({
  isFilesPanelDisplayed,
  isTemplatePanelDisplayed,
  isEditingInner,
}) =>
  Toolbar({
    classNames: [n('content-toolbar')],
    children: [
      ToggleButton({
        isOpen: isFilesPanelDisplayed,
        name: 'files-panel',
      }),
      FileUploadButton(),
      ChooseTemplatesButton({
        [g('text-button')]: true,
        [n('templates-button')]: true,
        [n('selected')]: isTemplatePanelDisplayed,
      }),
      ToggleInnerOuterContentButton({isEditingInner}),
      ExportButton(),
    ],
  });

/**
 * Renders default editor content to hydrate on runtime.
 * @param {Object} data
 * @param {string=} data.content
 * @return {lit-html/TemplateResult}
 */
const Textarea = ({content}) => html`
  <textarea>${content}</textarea>
`;

/**
 * @param {Object} data
 * @param {boolean} data.isFullPreview
 * @param {string} data.viewportId
 * @param {Element=} data.previewElement
 * @param {string=} data.storyDocTemplate
 * @return {lit-html/TemplateResult}
 */
const PreviewPanel = ({
  isFullPreview,
  viewportId,
  previewElement,
  storyDocTemplate,
}) => html`
  <div class="${g('flex-center')} ${n('preview-wrap')}">
    <!-- Toolbar for full preview toggle and viewport selector. -->
    ${PreviewToolbar({
      isFullPreview,
      viewportId,
    })}
    ${Viewport({
      viewportId,
      // Empty preview for SSR and inserted as data on the client.
      previewElement: previewElement || EmptyPreview({storyDocTemplate}),
    })}
  </div>
`;

const dispatchUpdatePreview = redispatchAs(g('update-preview'));

const UpdatePreviewButton = () => html`
  <div class="${n('update-preview-button')}" @click=${dispatchUpdatePreview}>
    ${RefreshIcon()}
  </div>
`;

/**
 * Renders preview panel toolbar.
 * @param {Object} data
 * @param {boolean=} data.isFullPreview
 * @param {string=} data.viewportId
 * @return {lit-html/TemplateResult}
 */
const PreviewToolbar = ({isFullPreview, viewportId}) =>
  Toolbar({
    classNames: [n('preview-toolbar')],
    children: [
      ToggleButton({
        isOpen: !isFullPreview,
        name: 'full-preview',
      }),
      ViewportSelector({
        className: [g('flex-center')],
        viewportId,
      }),
      UpdatePreviewButton(),
    ],
  });

/**
 * Renders preview element.
 * This is then managed independently by AmpStoryAdPreview after hydration.
 * @param {Object} data
 * @param {string} data.storyDocTemplate
 * @return {lit-html/TemplateResult}
 */
const EmptyPreview = ({storyDocTemplate}) => html`
  <div class=${n('preview')} data-template=${storyDocTemplate}></div>
`;

class Editor {
  constructor(win, element) {
    const {value} = element.querySelector('textarea');
    const previewElement = element.querySelector(s('.preview'));

    this.win = win;

    this.parent_ = element.parentElement;

    this.amphtmlHints_ = idleSuccessfulFetch(win, hintsUrl).then(r => r.json());

    this.fetchTemplateContent_ = fetchTemplateContentFactory(win);

    const {
      promise: codeMirrorElement,
      resolve: codeMirrorElementResolve,
    } = new Deferred();

    this.codeMirror_ = new WrappedCodemirror(win, codeMirrorElementResolve, {
      value,
    });

    this.preview_ = new AmpStoryAdPreview(win, previewElement);

    this.viewportIdBeforeFullPreview_ = null;

    const batchedRender = batchedApplier(win, () => this.render_());

    this.adState_ = null;

    this.hasVideoWarned_ = false;

    this.state_ = appliedState(batchedRender, {
      // No need to bookkeep `content` since we've populated codemirror with it.
      codeMirrorElement,
      files: [],
      isFullPreview: false,
      isDownloading: false,
      isEditingInner: true,
      isExporting: false,
      isTemplatePanelDisplayed: false,
      previewElement,
      showVideoWarning: false,
      templates: parseTemplatesJsonScript(element),
      viewportId: viewportIdDefault,
    });

    // Lit html takeover.
    batchedRender();

    this.refreshCodeMirror_();
    // This call happens before AmpStoryPreview render(), but the
    // AmpStoryPreview#update method awaits the resolution of the render.
    this.updatePreview_();

    // We only run amp4ads in this REPL.
    this.setHints_('amp4ads');

    this.codeMirror_.on('dragover', () => this.dragover_());
    this.codeMirror_.on('dragleave', () => this.dragleaveOrDragEnd_());

    listenAllBound(this, this.parent_, {
      dragend: this.dragleaveOrDragend_,
      dragleave: this.dragleaveOrDragend_,
      dragover: this.dragover_,
      drop: this.drop_,
      [g('delete-file')]: this.deleteFile_,
      [g('download-files')]: this.downloadFiles_,
      [g('dismiss-warning')]: this.dismissVideoWarning_,
      [g('insert-file-ref')]: this.insertFileRef_,
      [g('select-template')]: this.selectTemplate_,
      [g('select-viewport')]: this.selectViewport_,
      [g('toggle-inner-outer')]: this.toggleStoryMode_,
      [g('toggle-export')]: this.toggleExportModal_,
      [g('toggle-templates')]: this.toggleTemplates_,
      [g('toggle')]: this.toggle_,
      [g('update-preview')]: this.updatePreview_,
      [g('upload-files')]: this.uploadFiles_,
    });
  }

  /**
   * Toggles something on ToggleButton click.
   * (Figures out what to toggle from `data-name` attribute.)
   * @param {Event} e
   * @private
   */
  toggle_({target: {dataset}}) {
    const name = assert(dataset.name);
    if (name == 'full-preview') {
      return this.toggleFullPreview_();
    }
    if (name == 'files-panel') {
      return this.toggleFilesPanel_();
    }
    assert(false, `I don't know how to toggle "${name}".`);
  }

  // Select templates.
  async selectTemplate_({target: {dataset}}) {
    if (!this.state_.isEditingInner) {
      this.toggleStoryMode_();
    }
    const templateName = assert(dataset.name);
    const {files} = this.state_.templates[templateName];
    this.codeMirror_.setValue(await this.fetchTemplateContent_(templateName));
    this.state_.files = files.map(name => ({
      name,
      url: templateFileUrl(templateName, name),
    }));
    this.state_.isFilesPanelDisplayed = true;
    this.state_.isTemplatePanelDisplayed = false;
  }

  /**
   * Uploads files from an `<input>` target.
   * @param {Event} e
   */
  uploadFiles_({target: {files}}) {
    this.addFiles_(files);
  }

  /**
   * @param {IArrayLike<File>} files
   * @private
   */
  async addFiles_(files) {
    this.state_.isFilesPanelDisplayed = true;
    this.state_.files = await concatAttachBlobUrl(this.state_.files, files);
    this.updateFileHints_();
  }

  toggleTemplates_() {
    this.state_.isTemplatePanelDisplayed = !this.state_
      .isTemplatePanelDisplayed;
  }

  selectViewport_({target}) {
    const {value} = target;

    // If viewport is changed to 'full', the view will display an error message
    // instead of the preview.
    // TODO: Make 'full' special and add custom sizing
    // When changing viewport to a smaller viewport, elements may get
    // cut off.
    // TODO: fix this
    this.state_.viewportId = validViewportId(value);
  }

  render_() {
    render(renderEditor(this.state_), this.parent_, {eventContext: this});
  }

  /** @private */
  async refreshCodeMirror_() {
    // Render is async: we wait for the element to be attached to refresh.
    await untilAttached(this.parent_, this.state_.codeMirrorElement);
    this.codeMirror_.refresh();
  }

  updatePreview_() {
    const doc = this.codeMirror_.getValue();
    const docWithFileRefs = replaceFileRefs(doc, this.state_.files);
    // Editing ad.
    if (this.state_.isEditingInner) {
      return this.preview_.update(docWithFileRefs);
    }

    // Editing outer story.
    this.preview_.updateOuter(docWithFileRefs);
  }

  toggleFullPreview_() {
    this.state_.isFullPreview = !this.state_.isFullPreview;

    // Set full viewport and keep previous for restoring later.
    if (this.state_.isFullPreview) {
      this.viewportIdBeforeFullPreview_ = this.state_.viewportId;
      this.state_.viewportId = viewportIdFull;
      return;
    }

    // Restore viewport as it was before toggling.
    if (this.viewportIdBeforeFullPreview_) {
      this.state_.viewportId = this.viewportIdBeforeFullPreview_;
      this.viewportIdBeforeFullPreview_ = null;
    }
  }

  toggleFilesPanel_() {
    this.state_.isFilesPanelDisplayed = !this.state_.isFilesPanelDisplayed;
  }

  insertFileRef_({target: {dataset}}) {
    const name = assert(dataset.name);
    this.codeMirror_.replaceSelection(readableFileUrl(name), 'around');
  }

  deleteFile_({target}) {
    const {dataset} = assert(target.closest('[data-index]'));
    const index = parseInt(assert(dataset.index), 10);
    this.state_.files = removeUploadedFile(this.state_.files, index);
    this.updateFileHints_();
  }

  /**
   * Replaces CodeMirror hints with the AMP spec.
   *
   * Kinda stolen from @ampproject/docs/playground/src/editor.js
   * (Editor#loadHints).
   *
   * Additionally sets uploaded file name hints for attrs like "src".
   *
   * @param {string} format
   *    Should always be "amp4ads" for our use case, see top-level keys of
   *    amphtml-hint.json for possible values.
   * @private
   */
  async setHints_(format) {
    const htmlSchema = this.codeMirror_.getHintHtmlSchema();
    const hints = await this.amphtmlHints_;
    for (const key of Object.keys(htmlSchema)) {
      delete htmlSchema[key];
    }
    Object.assign(htmlSchema, hints[format.toLowerCase()]);

    // Below, ours:
    // - Sets attribute values for `meta[content]` to hint CTA
    // - Sets uploaded file hints
    htmlSchema.meta.attrs.content = Object.keys(CTA_TYPES);
    this.updateFileHints_();
  }

  /**
   * Sets attr hints like for "src" and "poster" for the tags in the spec that
   * allow it, so that they show uploaded files.
   * @private
   */
  updateFileHints_() {
    setAttrFileHints(
      this.codeMirror_.getHintHtmlSchema(),
      this.state_.files.map(({name}) => readableFileUrl(name))
    );
  }

  /**
   * Triggers when dragging files over the entire page.
   * @private
   */
  dragover_() {
    this.state_.isFilesDragHintDisplayed = true;
  }

  /**
   * Triggers when dragging has left, or when it was cancelled (by ESC key or
   * otherwise.)
   * @private
   */
  dragleaveOrDragend_() {
    this.state_.isFilesDragHintDisplayed = false;
  }

  /**
   * Triggers when a file is dropped.
   * @param {Event} e
   */
  drop_(e) {
    e.preventDefault();

    this.state_.isFilesDragHintDisplayed = false;

    if (!e.dataTransfer) {
      return;
    }

    const {files} = e.dataTransfer;
    if (files && files.length) {
      this.addFiles_(files);
    }
  }

  toggleStoryMode_() {
    this.state_.isEditingInner = !this.state_.isEditingInner;
    // Story Mode. We save the ad state in case user switches back to ad mode,
    // write the last known ad url into the editor, and turn off the forced
    // navigation to the ad.
    if (!this.state_.isEditingInner) {
      this.adState_ = this.codeMirror_.getValue();
      const storyDoc = this.preview_.storyDoc.replace(
        ampStoryAutoAdsRE,
        storyAdsConfig(this.preview_.getAdUrl())
      );
      return this.codeMirror_.setValue(storyDoc);
    }

    // Ad Mode.
    this.codeMirror_.setValue(this.adState_);
  }

  toggleExportModal_() {
    this.state_.isExporting = !this.state_.isExporting;
  }

  async downloadFiles_(e) {
    const {target} = e.target.dataset;
    this.state_.isDownloading = true;
    // Yield thread to give lit a chance to render the loader before the
    // expensive operations below.
    // TODO: still seems laggy. Find a better way...
    await setTimeout(null, 10);

    const zip = JSZip();
    const html = this.state_.isEditingInner
      ? this.codeMirror_.getValue()
      : this.adState_;
    zip.file('index.html', html);

    const filePromises = this.state_.files.map(({name, url}) => {
      if (target !== 'local' && name.endsWith('.mp4')) {
        this.maybeshowVideoWarning_();
      }
      return fetch(url)
        .then(res => res.blob())
        .then(blob => zip.file(name, blob));
    });

    await Promise.all(filePromises);

    const blob = await zip.generateAsync({type: 'blob'});
    save(blob);

    this.state_.isDownloading = false;
    this.state_.isExporting = false;
  }

  maybeshowVideoWarning_() {
    if (!this.hasVideoWarned_) {
      this.state_.showVideoWarning = true;
      this.hasVideoWarned_ = true;
    }
  }

  dismissVideoWarning_() {
    this.state_.showVideoWarning = false;
  }
}

// Standard executable-renderable bundle interface, see lib/bundle.js
export {
  id,
  Editor as ctor,
  renderEditor as renderComponent,
  staticServerData as data,
};

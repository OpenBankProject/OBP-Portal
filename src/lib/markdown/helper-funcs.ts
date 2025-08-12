import { createLogger } from '$lib/utils/logger';
const logger = createLogger('MarkdownHelper');
import MarkdownIt from "markdown-it";

// Imports for syntax highlighting
// Languages that we want syntax highlighting for need to be imported here
import Prism from 'prismjs';
import 'prismjs/themes/prism.css'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-liquid'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-markup-templating'
import 'prismjs/components/prism-php'
import 'prismjs/components/prism-scss'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-http';
import 'prismjs/themes/prism-okaidia.css';


function _highlightCode(content: string, language: string) {
    if (Prism.languages[language]) {
        return Prism.highlight(content, Prism.languages[language], language);
    } else {
        logger.warn(`could not highlight ${language} code block, add language to dependencies`);
        // If the language is not recognized, return the content as is
        return content;
    }
}

export function renderMarkdown(content: string) {
    const markdown = new MarkdownIt({
        highlight: (str: string, lang: string): string => {
            if (lang && Prism.languages[lang]) {
                try {
                    return `<pre class="language-${lang}"><code>${_highlightCode(str, lang)}</code></pre>`;
                } catch (error) {
                    logger.warn(`error hilighting ${lang} code block: ${error}`);
                }
            } else if (!lang) {
                logger.warn('No language specified for code block');
            } else if (!Prism.languages[lang]) {
                logger.warn(
                    `Language ${lang} not recognized or not installed, see imports for this component`
                );
            }

            // If the language is not specified or not recognized, use a default language
            return `<pre class="language-"><code>${markdown.utils.escapeHtml(str)}</code></pre>`;
        }
    });

    return markdown.render(content);
}
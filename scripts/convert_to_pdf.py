import markdown
import os
import re
import sys

def convert_md_to_html(input_path, output_path):
    # 1. Read Markdown content
    with open(input_path, 'r', encoding='utf-8') as f:
        md_content = f.read()

    # 2. Pre-process Mermaid blocks
    # Convert ```mermaid ... ``` to <div class="mermaid"> ... </div>
    # The markdown parser usually handles fenced code, but we want a specific div for mermaid.js
    def mermaid_replacer(match):
        code = match.group(1)
        return f'<div class="mermaid">\n{code}\n</div>'
    
    md_content = re.sub(r'```mermaid\s*\n([\s\S]*?)\n```', mermaid_replacer, md_content)

    # 3. Convert to HTML
    # We use 'tables' extension for the tables in the document
    html_body = markdown.markdown(md_content, extensions=['tables', 'fenced_code'])

    # 4. Construct Full HTML with CSS and Mermaid JS
    html_template = f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>项目计划书 - CoPilot Care</title>
    <style>
        body {{
            font-family: "Times New Roman", "SimSun", serif;
            line-height: 1.6;
            max-width: 210mm;
            margin: 0 auto;
            padding: 20mm;
            color: #333;
            background-color: white;
        }}
        h1, h2, h3, h4 {{
            font-family: "Arial", "Microsoft YaHei", sans-serif;
            color: #2c3e50;
        }}
        h1 {{ border-bottom: 2px solid #2c3e50; padding-bottom: 10px; }}
        h2 {{ border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 30px; }}
        table {{
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
            font-size: 0.9em;
        }}
        th, td {{
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
        }}
        th {{
            background-color: #f2f2f2;
            font-weight: bold;
        }}
        tr:nth-child(even) {{
            background-color: #f9f9f9;
        }}
        blockquote {{
            border-left: 4px solid #ddd;
            margin: 0;
            padding-left: 15px;
            color: #666;
        }}
        code {{
            background-color: #f4f4f4;
            padding: 2px 5px;
            border-radius: 3px;
            font-family: Consolas, monospace;
        }}
        pre {{
            background-color: #f4f4f4;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }}
        .mermaid {{
            text-align: center;
            margin: 30px 0;
        }}
        /* Print Styles */
        @media print {{
            body {{
                max-width: 100%;
                padding: 0;
                margin: 0;
            }}
            @page {{
                margin: 20mm;
            }}
            .no-print {{
                display: none;
            }}
        }}
        .print-btn {{
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }}
        .print-btn:hover {{
            background-color: #0056b3;
        }}
    </style>
</head>
<body>
    <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
    
    {html_body}

    <!-- Mermaid JS Integration -->
    <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
        mermaid.initialize({{ startOnLoad: true }});
    </script>
</body>
</html>
    """

    # 5. Write to output file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_template)
    
    print(f"Successfully converted '{input_path}' to '{output_path}'")
    return output_path

if __name__ == "__main__":
    input_file = "项目计划书/CoPilot_Care_完整打印版.md"
    output_file = "项目计划书/CoPilot_Care_完整打印版.html"
    
    # Allow command line args override
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
        
    try:
        abs_input = os.path.abspath(input_file)
        abs_output = os.path.abspath(output_file)
        
        if not os.path.exists(abs_input):
            print(f"Error: Input file not found at {abs_input}")
            sys.exit(1)
            
        convert_md_to_html(abs_input, abs_output)
    except Exception as e:
        print(f"Conversion failed: {str(e)}")
        sys.exit(1)

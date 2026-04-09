import fitz  # 导入 PyMuPDF

# ================= 1. 核心过滤参数 (请填入你刚才测试好觉得准确的数值) =================
HEADER_RATIO = 0.122  # 丢弃顶部 8% 区域的文本 (去页眉)

FOOTER_RATIO = 0.95  # 丢弃底部 8% 区域的文本 (去页脚/页码)

LEFT_EDGE = 0.08     # 丢弃靠左 12% 以内的文本 (去左水印)

RIGHT_EDGE = 0.92    # 丢弃靠右 12% 以外的文本 (去右水印)

def extract_final_pure_md(pdf_path, output_md):
    """
    最终执行函数：严格遵循边界，只将“绿框”内的文本写入 Markdown，彻底丢弃“红框”内容。
    """
    print(f"📖 正在执行高精度纯净提取: {pdf_path}")
    doc = fitz.open(pdf_path)
    
    with open(output_md, "w", encoding="utf-8") as f:
        total_pages = len(doc)
        
        for i, page in enumerate(doc):
            w, h = page.rect.width, page.rect.height
            blocks = page.get_text("blocks")
            
            # 按照从上到下的顺序排列段落
            blocks.sort(key=lambda b: (b[1], b[0]))
            
            page_text = []
            
            for b in blocks:
                x0, y0, x1, y1, text, block_no, block_type = b
                
                # 1. 过滤掉图片
                if block_type != 0:
                    continue
                
                # 2. 严格执行“红线外丢弃”法则 (对应之前预览图里的红框)
                if y1 < h * HEADER_RATIO or y0 > h * FOOTER_RATIO:
                    continue  # 越过上下界，直接丢弃，不记录！
                if x1 < w * LEFT_EDGE or x0 > w * RIGHT_EDGE:
                    continue  # 越过左右界，直接丢弃，不记录！
                
                # 3. 只有顺利通过上述考验的“绿框”正文，才会被留下来
                clean_text = text.replace('\n', '').strip()
                if clean_text:
                    page_text.append(clean_text)
            
            # 将这一页纯净的正文写入 md 文件
            if page_text:
                # 段落间保留一个空行，排版更美观
                f.write("\n\n".join(page_text) + "\n\n")
                
            if (i + 1) % 50 == 0:
                print(f"⏳ 进度: 已完美提取 {i + 1} / {total_pages} 页...")

    doc.close()
    print(f"\n🎉 大功告成！纯净版正文已成功保存至: {output_md}")


# ================= 2. 一键执行 =================
if __name__ == "__main__":
    # 确认你的文件路径
    input_pdf = r"G:\书籍\中文\倪柝声\倪柝声《旷野的筵席》.pdf" 
    output_markdown = "旷野的筵席_最终纯净版.md"
    
    # 直接开始全力提取
    extract_final_pure_md(input_pdf, output_markdown)
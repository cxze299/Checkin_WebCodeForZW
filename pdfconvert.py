import fitz  # 导入 PyMuPDF

# ================= 1. 核心参数设置 =================
# 在这里调整你的剪刀位置 (0.0 到 1.0 之间)
# 例如：0.10 表示切掉左边 10%，0.90 表示切掉右边 10%
LEFT_CROP_RATIO = 0.12  
RIGHT_CROP_RATIO = 0.88 

def debug_crop_box(pdf_path, test_page_index=10):
    """
    【调试神器】抽查一页，画出红色的裁剪框，并保存为图片供你预览。
    """
    print(f"🛠️ 正在生成第 {test_page_index + 1} 页的裁剪预览图...")
    doc = fitz.open(pdf_path)
    
    if test_page_index >= len(doc):
        test_page_index = len(doc) - 1
        
    page = doc[test_page_index]
    rect = page.rect
    width, height = rect.width, rect.height
    
    # 计算安全区域的物理坐标
    safe_rect = fitz.Rect(width * LEFT_CROP_RATIO, 0, width * RIGHT_CROP_RATIO, height)
    
    # 在页面上画一个红色的矩形框 (RGB: 1,0,0)
    page.draw_rect(safe_rect, color=(1, 0, 0), width=2)
    
    # 导出为图片
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
    preview_img = "crop_preview.png"
    pix.save(preview_img)
    doc.close()
    
    print(f"✅ 预览图已生成: {preview_img}")
    print("👉 请打开这张图片看看红框。正文必须全在红框内，水印必须全在红框外！")
    print("👉 如果不满意，请微调代码顶部的 LEFT_CROP_RATIO 和 RIGHT_CROP_RATIO。\n")


def extract_pdf_with_toc(pdf_path, output_md):
    """
    正式提取函数：利用目录生成标题，并进行物理防篡改裁剪。
    """
    print(f"📖 正在打开 PDF 进行全文提取: {pdf_path}")
    doc = fitz.open(pdf_path)
    
    # 提取目录
    toc = doc.get_toc()
    page_to_toc = {}
    for item in toc:
        level, title, page_num = item[0], item[1], item[2]
        page_index = page_num - 1 
        if page_index not in page_to_toc:
            page_to_toc[page_index] = []
        page_to_toc[page_index].append((level, title))
        
    print(f"🔍 成功识别到 {len(toc)} 条目录书签！开始提取...")

    with open(output_md, "w", encoding="utf-8") as f:
        total_pages = len(doc)
        
        for i, page in enumerate(doc):
            # 写入该页的目录标题
            if i in page_to_toc:
                for level, title in page_to_toc[i]:
                    md_header = "#" * level
                    f.write(f"\n\n{md_header} {title}\n\n")
            
            # 应用裁剪区域
            rect = page.rect
            safe_rect = fitz.Rect(rect.width * LEFT_CROP_RATIO, 0, rect.width * RIGHT_CROP_RATIO, rect.height)
            
            # 提取安全框内的文本
            text = page.get_text("text", clip=safe_rect)
            
            # 清洗并写入
            if text.strip():
                clean_lines = [line.strip() for line in text.split('\n') if line.strip()]
                clean_text = "\n".join(clean_lines)
                f.write(clean_text + "\n\n")
                
            if (i + 1) % 50 == 0:
                print(f"⏳ 进度: 已处理 {i + 1} / {total_pages} 页...")

    doc.close()
    print(f"\n🎉 提取完美收官！结果已保存至: {output_md}")

# ================= 3. 运行逻辑 =================
if __name__ == "__main__":
    # ⚠️ 请确认你的文件名和路径
    input_pdf = "123.pdf" 
    output_markdown = "123_extracted.md"
    
    # 第一步：先生成一张预览图让你检查剪刀位置（默认抽查第10页）
    # 如果报错说超出页码，可以把 10 改成 2 或 3
    debug_crop_box(input_pdf, test_page_index=10)
    
    # 第二步：如果你看了预览图觉得没问题，直接按回车键开始全文提取
    user_input = input("请查看生成的 crop_preview.png。红框位置准吗？\n准的话按【回车键】开始全文转换，不准请按【Ctrl+C】退出并修改比例代码：")
    
    extract_pdf_with_toc(input_pdf, output_markdown)
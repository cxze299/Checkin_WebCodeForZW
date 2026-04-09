import fitz  # 导入 PyMuPDF

# ================= 1. 核心参数设置 (上下左右全方位裁剪) =================
LEFT_CROP_RATIO = 0.08    # 左侧边界
RIGHT_CROP_RATIO = 0.98   # 右侧边界
TOP_CROP_RATIO = 0.122    # 顶部边界
BOTTOM_CROP_RATIO = 0.95  # 底部边界

def debug_crop_box(pdf_path, num_samples=10):
    """
    【升级版调试神器】从全书中均匀抽取多页，画出红色的全方位裁剪框。
    """
    print(f"🛠️ 正在从全书中均匀抽取 {num_samples} 页生成裁剪预览图...")
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    
    # 避免抽样数大于总页数
    num_samples = min(num_samples, total_pages)
    
    # 计算均匀分布的页码索引
    step = total_pages / num_samples
    test_pages = [int(i * step) for i in range(num_samples)]
    
    for page_index in test_pages:
        page = doc[page_index]
        rect = page.rect
        width, height = rect.width, rect.height
        
        # 应用上下左右四个边界
        safe_rect = fitz.Rect(
            width * LEFT_CROP_RATIO, 
            height * TOP_CROP_RATIO, 
            width * RIGHT_CROP_RATIO, 
            height * BOTTOM_CROP_RATIO
        )
        
        # 在页面上画一个红色的矩形框 (RGB: 1,0,0)
        page.draw_rect(safe_rect, color=(1, 0, 0), width=2)
        
        # 导出为图片 (名字里带上真实的页码，方便你对照查找)
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        preview_img = f"crop_preview_page_{page_index + 1}.png"
        pix.save(preview_img)
        print(f"  ✅ 生成预览图: {preview_img}")
        
    doc.close()
    print("\n👉 请在当前文件夹下查看这批图片。")
    print("👉 确保这 10 张图的红框都完美包住了正文，且避开了干扰信息。")
    print("👉 如果有任何一张切偏了，请按 Ctrl+C 退出，微调顶部的 4 个参数后再试。\n")


def extract_pdf_with_toc(pdf_path, output_md):
    """
    正式提取函数：利用目录生成标题，并进行全方位物理防篡改裁剪。
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
            
            # 应用上下左右全方位裁剪区域
            rect = page.rect
            width, height = rect.width, rect.height
            safe_rect = fitz.Rect(
                width * LEFT_CROP_RATIO, 
                height * TOP_CROP_RATIO, 
                width * RIGHT_CROP_RATIO, 
                height * BOTTOM_CROP_RATIO
            )
            
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
    input_pdf = "G:\\书籍\\中文\\倪柝声\\倪柝声《旷野的筵席》.pdf" 
    output_markdown = "Kuangye.md"
    
    # 自动生成 10 张均匀分布的测试图
    debug_crop_box(input_pdf, num_samples=10)
    
    user_input = input("请查看生成的这批预览图。红框位置准吗？\n准的话按【回车键】开始全文转换，不准请按【Ctrl+C】退出：")
    
    extract_pdf_with_toc(input_pdf, output_markdown)
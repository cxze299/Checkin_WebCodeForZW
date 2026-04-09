import os
import re

def clean_diary_formatting(input_path, output_path):
    """处理错乱的##符号，保护标题空格，清理正文多余空格"""
    
    with open(input_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    cleaned_lines = []
    consecutive_empty_lines = 0

    for line in lines:
        line = line.rstrip()

        # 1. 过滤假标题（去除错位的 ##）
        # 如果一行以 # 开头，但里面没有 "月" 和 "日"，说明它是 OCR 多识别出来的
        if re.match(r'^#+', line) and not re.search(r'月.*日', line):
            # 删掉开头的 # 以及紧跟着的空格，让它变回普通正文
            line = re.sub(r'^#+\s*', '', line)

        # 2. 清理不必要的换行
        if not line:
            consecutive_empty_lines += 1
            if consecutive_empty_lines > 1:
                continue
        else:
            consecutive_empty_lines = 0

        # 3. 智能清理正文中的多余空格，同时保护真实标题
        if line:
            # 判断：如果现在这一行是真正的标题行（包含 #），直接放行，保护里面的空格
            if re.match(r'^#+', line):
                pass 
            else:
                # 如果是普通正文：剔除中文标点和汉字周围的多余空格
                match = re.match(r'^((?:\-\s+|\*\s+|\>\s+|\d+\.\s+)?)(.*)$', line)
                if match:
                    prefix = match.group(1)
                    content = match.group(2)
                    
                    # 清理中文/全角符号与空格之间的间隙
                    content = re.sub(r'([^\x00-\xff])\s+', r'\1', content)
                    content = re.sub(r'\s+([^\x00-\xff])', r'\1', content)
                    
                    line = prefix + content

        cleaned_lines.append(line)

    # 移除整个文件最开头和最末尾的多余空行
    while cleaned_lines and not cleaned_lines[0]:
        cleaned_lines.pop(0)
    while cleaned_lines and not cleaned_lines[-1]:
        cleaned_lines.pop()

    # 写入新文件
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(cleaned_lines) + '\n')
        
    print(f"✅ 已完成排版修复：{os.path.basename(output_path)}")

def process_directory(directory_path):
    """遍历目录，处理所有 .md 文件并输出到新文件夹"""
    md_files_found = False
    
    output_dir = os.path.join(directory_path, "cleaned_diaries")
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    for filename in os.listdir(directory_path):
        if filename.endswith(".md"):
            md_files_found = True
            input_file_path = os.path.join(directory_path, filename)
            output_file_path = os.path.join(output_dir, filename)
            
            clean_diary_formatting(input_file_path, output_file_path)
            
    if not md_files_found:
        print("⚠️ 当前目录下没有找到 .md 文件。")
        if os.path.exists(output_dir) and not os.listdir(output_dir):
            os.rmdir(output_dir)
    else:
        print("-" * 30)
        print(f"🎉 处理完成！修复好的日记已保存在：\n📂 {output_dir}")

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"开始扫描并清理目录：{current_dir}\n" + "-"*30)
    
    process_directory(current_dir)
require "json"
require "erb"

def render_html(json_str, template_str, css_str, js_str, i18n_str, page_title = "分析結果")
  data = JSON.parse(json_str)
  title = page_title
  css = css_str
  js = js_str
  report_json = data.to_json
  i18n_json = i18n_str
  overview = data["overview"] || ""
  overview_html = overview.split("\n").reject(&:empty?).map { |p| "<p>#{p}</p>" }.join("\n")
  comment_count = data["comment_num"] || data.dig("config", "comment_num") || 0
  clusters = (data["clusters"] || [])
    .select { |c| c["level"] == 1 }
    .sort_by { |c| -(c["value"] || 0) }
  cluster_colors = %w[#7ac943 #3fa9f5 #ff7997 #ffcc5c #845ec2 #00c9a7 #ff6f61 #6c5ce7 #fdcb6e #74b9ff]
  cluster_color = ->(index) { cluster_colors[index % cluster_colors.length] }
  ERB.new(template_str, trim_mode: "-").result(binding)
end

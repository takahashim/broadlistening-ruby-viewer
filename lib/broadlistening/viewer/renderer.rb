# frozen_string_literal: true

require "json"
require "erb"

module Broadlistening
  module Viewer
    class Renderer
      CLUSTER_COLORS = %w[#7ac943 #3fa9f5 #ff7997 #ffcc5c #845ec2 #00c9a7 #ff6f61 #6c5ce7 #fdcb6e #74b9ff].freeze

      def self.assets_path
        File.expand_path("assets", __dir__)
      end

      def initialize(title: "分析結果")
        @title = title
      end

      def render(json_str)
        data = JSON.parse(json_str)
        title = @title
        css = load_asset("app.css")
        js = load_asset("broadlistening-view.js")
        report_json = data.to_json
        i18n_json = load_asset("i18n/ja.json")
        overview = data["overview"] || ""
        overview_html = overview.split("\n").reject(&:empty?).map { |p| "<p>#{p}</p>" }.join("\n")
        comment_count = data["comment_num"] || data.dig("config", "comment_num") || 0
        clusters = (data["clusters"] || [])
          .select { |c| c["level"] == 1 }
          .sort_by { |c| -(c["value"] || 0) }
        cluster_color = ->(index) { CLUSTER_COLORS[index % CLUSTER_COLORS.length] }
        template_str = load_asset("template.html.erb")
        ERB.new(template_str, trim_mode: "-").result(binding)
      end

      def save(json_str, output_path)
        html = render(json_str)
        File.write(output_path, html)
        output_path
      end

      private

      def load_asset(name)
        File.read(File.join(self.class.assets_path, name))
      end
    end
  end
end

# Keep the top-level function for backward compatibility (used by ruby.wasm site mode)
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
  cluster_colors = Broadlistening::Viewer::Renderer::CLUSTER_COLORS
  cluster_color = ->(index) { cluster_colors[index % cluster_colors.length] }
  ERB.new(template_str, trim_mode: "-").result(binding)
end

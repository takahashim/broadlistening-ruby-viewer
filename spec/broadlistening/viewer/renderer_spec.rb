# frozen_string_literal: true

require "spec_helper"
require "tmpdir"

RSpec.describe Broadlistening::Viewer::Renderer do
  let(:minimal_data) do
    { "clusters" => [], "comment_num" => 0 }.to_json
  end

  let(:full_data) do
    {
      "overview" => "概要の1行目\n概要の2行目",
      "comment_num" => 42,
      "clusters" => [
        { "id" => "c1", "level" => 1, "label" => "クラスタA", "value" => 10, "takeaway" => "要約A" },
        { "id" => "c2", "level" => 1, "label" => "クラスタB", "value" => 25, "takeaway" => "要約B" },
        { "id" => "c3", "level" => 2, "label" => "サブクラスタ", "value" => 5, "takeaway" => "" }
      ]
    }.to_json
  end

  describe "#initialize" do
    it "defaults title to 分析結果" do
      renderer = described_class.new
      html = renderer.render(minimal_data)
      expect(html).to include("<title>分析結果</title>")
    end

    it "accepts a custom title" do
      renderer = described_class.new(title: "カスタムタイトル")
      html = renderer.render(minimal_data)
      expect(html).to include("<title>カスタムタイトル</title>")
    end
  end

  describe "#render" do
    subject(:html) { described_class.new.render(full_data) }

    it "returns a valid HTML document" do
      expect(html).to start_with("<!DOCTYPE html>")
      expect(html).to include("<html lang=\"ja\">")
      expect(html).to include("</html>")
    end

    it "renders comment count" do
      expect(html).to include("42")
    end

    it "renders overview paragraphs" do
      expect(html).to include("<p>概要の1行目</p>")
      expect(html).to include("<p>概要の2行目</p>")
    end

    it "renders level-1 clusters sorted by value descending" do
      grid = html[html.index("cluster-grid")..html.index("</section>", html.index("cluster-grid"))]
      b_pos = grid.index("クラスタB")
      a_pos = grid.index("クラスタA")
      expect(b_pos).to be < a_pos
    end

    it "excludes level-2 clusters from the grid" do
      grid_start = html.index("cluster-grid")
      grid_section = html[grid_start..html.index("</section>", grid_start)]
      expect(grid_section).not_to include("サブクラスタ")
    end

    it "applies cluster colors as border styles" do
      expect(html).to include("border-left: 4px solid #{described_class::CLUSTER_COLORS[0]}")
    end

    context "with no overview" do
      subject(:html) { described_class.new.render(minimal_data) }

      it "omits the overview section" do
        expect(html).not_to include("<section class=\"bg-gray-50")
      end
    end

    context "with comment_num in config" do
      let(:config_data) do
        { "config" => { "comment_num" => 99 }, "clusters" => [] }.to_json
      end

      subject(:html) { described_class.new.render(config_data) }

      it "falls back to config.comment_num" do
        expect(html).to include("99")
      end
    end

    it "raises on invalid JSON" do
      expect { described_class.new.render("not json") }.to raise_error(JSON::ParserError)
    end
  end

  describe "#save" do
    it "writes rendered HTML to the specified path" do
      Dir.mktmpdir do |dir|
        output = File.join(dir, "output.html")
        result = described_class.new.save(minimal_data, output)

        expect(result).to eq(output)
        expect(File.exist?(output)).to be true

        content = File.read(output)
        expect(content).to start_with("<!DOCTYPE html>")
      end
    end
  end

  describe ".assets_path" do
    it "points to a directory containing required assets" do
      path = described_class.assets_path
      expect(File.exist?(File.join(path, "app.css"))).to be true
      expect(File.exist?(File.join(path, "broadlistening-view.js"))).to be true
      expect(File.exist?(File.join(path, "template.html.erb"))).to be true
      expect(File.exist?(File.join(path, "i18n", "ja.json"))).to be true
    end
  end
end

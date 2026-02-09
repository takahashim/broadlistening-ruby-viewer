#!/usr/bin/env ruby
require_relative "render"
require "optparse"
require "sass-embedded"

options = { title: "分析結果", output: nil }
OptionParser.new do |opts|
  opts.banner = "Usage: ruby generate.rb INPUT_JSON [-o OUTPUT] [--title TITLE]"
  opts.on("-o", "--output FILE") { |v| options[:output] = v }
  opts.on("--title TITLE") { |v| options[:title] = v }
end.parse!

input_file = ARGV[0] or abort("Usage: ruby generate.rb INPUT_JSON [-o OUTPUT] [--title TITLE]")
output_file = options[:output] || input_file.sub(/\.json$/, ".html")

script_dir = __dir__
json_str = File.read(input_file)
template_str = File.read(File.join(script_dir, "template.html.erb"))
i18n_str = File.read(File.join(script_dir, "i18n", "ja.json"))
js = File.read(File.join(script_dir, "dist", "broadlistening-view.js"))
css = Sass.compile(File.join(script_dir, "src", "app.scss")).css

html = render_html(json_str, template_str, css, js, i18n_str, options[:title])
File.write(output_file, html)
puts "Generated: #{output_file}"

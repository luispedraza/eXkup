#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os 
import shutil
from bs4 import BeautifulSoup as BS
from bs4 import Tag
import subprocess

SOURCE_DIR = 'src'
BUILD_DIR = 'build'
TOOLS_DIR = 'build-tools'
TEMP_DIR = 'temp'

JS_TOOL = 'yuicompressor-2.4.8.jar'
CSS_TOOL = 'yuicompressor-2.4.8.jar'

SOURCE_PATH = os.path.join('.', SOURCE_DIR)
TEMP_PATH = os.path.join('.', TEMP_DIR)
BUILD_PATH = os.path.join('.', BUILD_DIR)
JS_COMPRESSOR = os.path.join('.',TOOLS_DIR, JS_TOOL)
CSS_COMPRESSOR = os.path.join('.',TOOLS_DIR, CSS_TOOL)

JS_OUPUT_PATH = os.path.join(BUILD_PATH, 'js')
CSS_OUPUT_PATH = os.path.join(BUILD_PATH, 'css')

try:
	shutil.rmtree(BUILD_PATH)
	shutil.rmtree(TEMP_PATH)
	
except OSError as e:
	pass

os.mkdir(BUILD_PATH)		# el directorio de destino
os.mkdir(TEMP_PATH)		# el directorio temporal
os.mkdir(JS_OUPUT_PATH)
os.mkdir(CSS_OUPUT_PATH)

for path, directories, files in os.walk(SOURCE_PATH):
	relpath = os.path.relpath(path, SOURCE_PATH)
	dest_path = os.path.join(BUILD_PATH, relpath)
	# creación del directorio de destino
	if not os.path.exists(dest_path):
		os.makedirs(dest_path)
	# manipulación de los archivos
	for filename in files:
		file_path = os.path.join(path, filename)		# ruta del archivo html
		name, ext = os.path.splitext(filename)			# extensión del archivo
		# archivos html
		if ext == '.html':
			print "******* HTML *******"
			print "archivo: " + filename
			thefile = open(file_path)
			parsed_html = BS(thefile)
			thefile.close()
			# procesamiento del html
			scripts = parsed_html.findAll("script")
			if scripts:
				source = ""
				for s in scripts:
					js_file = os.path.join(path,s.get('src'))
					source += open(js_file).read() + "\n"	# agregar código
					s.extract()

				temp_file_name = os.path.join(TEMP_PATH, name+".js")	# js de este html
				temp_file = open(temp_file_name, 'w+')
				temp_file.write(source)
				temp_file.close()
				subprocess.call(['java', 
					'-jar',
					JS_COMPRESSOR,
					'-o',
					os.path.join(BUILD_PATH, relpath, 'js', name+'.min.js'),
					temp_file_name])
				compiled_script = os.path.join(relpath, 'js', name+'.min.js'),
				new_script = parsed_html.new_tag('script', type="text/javascript", src=compiled_script)
				parsed_html.body.insert(len(parsed_html.body.contents), new_script)

			new_html = parsed_html.prettify('utf-8')
			target_html_path = os.path.join(dest_path, filename)
			with open(target_html_path, 'w+') as target:
				target.write(new_html)
				target.close()
			

		#archivos js
		elif ext == '.js':
			pass
		# resto de archivos
		else:
			shutil.copy2(file_path, dest_path)




			


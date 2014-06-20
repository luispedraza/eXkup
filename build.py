#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os 
import shutil
from bs4 import BeautifulSoup as BS
import subprocess

SOURCE_DIR = 'src'
BUILD_DIR = 'build'
TOOLS_DIR = 'build-tools'

JS_COMPRESSOR = 'yuicompressor-2.4.8.jar'
CSS_COMPRESSOR = 'yuicompressor-2.4.8.jar'

SOURCE_PATH = os.path.join('.', SOURCE_DIR)
BUILD_PATH = os.path.join('.', BUILD_DIR)
JS_TOOL = os.path.join('.',TOOLS_DIR, JS_COMPRESSOR)
CSS_TOOL = os.path.join('.',TOOLS_DIR, CSS_COMPRESSOR)


try:
	shutil.rmtree(BUILD_PATH)
except OSError as e:
	pass

os.mkdir(BUILD_PATH)		# el directorio de destino

for path, directories, files in os.walk(SOURCE_PATH):
	print path
	relpath = os.path.relpath(path, SOURCE_PATH)
	print relpath
	dest_path = os.path.join(BUILD_PATH, relpath)
	# creación del directorio de destino
	if not os.path.exists(dest_path):
		os.makedirs(dest_path)
	# manipulación de los a     rchivos
	for filename in files:
		print "archivo: " + filename
		file_path = os.path.join(path, filename)	# ruta del archivo
		ext = os.path.splitext(filename)			# extensión del archivo
		# archivos html
		if ext[1] == '.html':
			thefile = open(file_path)
			parsed_html = BS(thefile)
			# procesamiento del html
			scripts = parsed_html.findAll("script")
			for s in scripts:
				print s
				print s.get('src')

			

			# cerramos el archivo
			thefile.close()

		#archivos js
		elif ext[1] == '.js':
			pass
		# resto de archivos
		else:
			print filename
			print "copiando " + file_path + " a " + dest_path
			shutil.copy2(file_path, dest_path)




			

